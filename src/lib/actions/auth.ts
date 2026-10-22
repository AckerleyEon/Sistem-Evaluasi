"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kirimEmailOtpResetSandi } from "@/lib/email";
import { buatKodeOtp, hashRahasia, samaAman } from "@/lib/keamanan";
import { ambilIp, catatPercobaan, hapusCatatan, menitTersisa, sisaBlokirMs } from "@/lib/rate-limit";
import { validasiSandi } from "@/lib/sandi";

const SATU_JAM_MS = 60 * 60 * 1000;
const LIMA_BELAS_MENIT_MS = 15 * 60 * 1000;
const MASA_OTP_MS = 10 * 60 * 1000;
const MASA_TAUTAN_MS = 60 * 60 * 1000;
const POLA_TOKEN = /^[a-f0-9]{64}$/;

export type HasilAuth = { ok?: true; error?: string };
export type HasilTautanReset = HasilAuth & { link?: string; namaDosen?: string; berlakuMenit?: number };

function terlaluBanyak(ms: number): { error: string } {
  return { error: `Terlalu banyak percobaan. Coba lagi dalam ${menitTersisa(ms)} menit.` };
}

/**
 * Respons sengaja sama untuk semua username (terdaftar atau tidak, Dosen atau Admin),
 * supaya halaman ini tidak bisa dipakai untuk menebak akun yang ada.
 */
export async function mintaResetSandi(formData: FormData): Promise<HasilAuth> {
  const username = String(formData.get("username") ?? "").trim();
  if (!username) return { error: "Username wajib diisi." };
  if (username.length > 64) return { error: "Username terlalu panjang." };

  const ip = ambilIp(await headers());
  const kunciIp = `reset-minta:${ip}`;
  const kunciUser = `reset-minta-user:${username.toLowerCase()}`;
  const blokir = Math.max(sisaBlokirMs(kunciIp, 5), sisaBlokirMs(kunciUser, 3));
  if (blokir > 0) return terlaluBanyak(blokir);
  catatPercobaan(kunciIp, SATU_JAM_MS);
  catatPercobaan(kunciUser, SATU_JAM_MS);

  const user = await prisma.user.findUnique({ where: { username } });

  if (user?.role === "DOSEN") {
    // Satu permintaan menunggu sudah cukup; jangan menumpuk baris di daftar admin.
    const sudahAda = await prisma.permintaanResetSandi.findFirst({
      where: { userId: user.id, status: "MENUNGGU" },
      select: { id: true },
    });
    if (!sudahAda) await prisma.permintaanResetSandi.create({ data: { userId: user.id } });
  } else if (user?.role === "ADMIN") {
    if (!user.email) {
      console.error(`Reset sandi: akun Admin "${user.username}" belum memiliki email terverifikasi.`);
    } else {
      const kodeOtp = buatKodeOtp();
      await prisma.user.update({
        where: { id: user.id },
        data: { otpKode: hashRahasia(kodeOtp), otpExpiresAt: new Date(Date.now() + MASA_OTP_MS) },
      });
      try {
        await kirimEmailOtpResetSandi(user.email, kodeOtp);
      } catch (err) {
        console.error("Gagal mengirim email OTP:", err);
      }
    }
  }

  return { ok: true };
}

export async function resetSandiDenganOtp(formData: FormData): Promise<HasilAuth> {
  const username = String(formData.get("username") ?? "").trim();
  const kodeOtp = String(formData.get("kodeOtp") ?? "").trim();
  const sandiBaru = String(formData.get("sandiBaru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");

  if (!username || !kodeOtp) return { error: "Username dan kode OTP wajib diisi." };
  if (!/^\d{6}$/.test(kodeOtp)) return { error: "Kode OTP terdiri dari 6 digit angka." };
  const galatSandi = validasiSandi(sandiBaru, konfirmasi);
  if (galatSandi) return { error: galatSandi };

  const ip = ambilIp(await headers());
  const kunciIp = `reset-otp:${ip}|${username.toLowerCase()}`;
  const kunciUser = `reset-otp:${username.toLowerCase()}`;
  const blokir = Math.max(sisaBlokirMs(kunciIp, 5), sisaBlokirMs(kunciUser, 10));
  if (blokir > 0) return terlaluBanyak(blokir);

  const user = await prisma.user.findUnique({ where: { username } });
  const valid =
    !!user &&
    !!user.otpKode &&
    !!user.otpExpiresAt &&
    user.otpExpiresAt >= new Date() &&
    samaAman(user.otpKode, hashRahasia(kodeOtp));

  if (!valid || !user) {
    catatPercobaan(kunciIp, LIMA_BELAS_MENIT_MS);
    catatPercobaan(kunciUser, LIMA_BELAS_MENIT_MS);
    return { error: "Kode OTP salah atau sudah kedaluwarsa." };
  }

  const hash = await bcrypt.hash(sandiBaru, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, otpKode: null, otpExpiresAt: null },
  });
  hapusCatatan(kunciIp);
  hapusCatatan(kunciUser);

  return { ok: true };
}

// Jalur Dosen: tautan sekali pakai yang dibuat Admin lalu dikirim manual ke dosen.
export async function resetSandiDenganToken(token: string, formData: FormData): Promise<HasilAuth> {
  const sandiBaru = String(formData.get("sandiBaru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const galatSandi = validasiSandi(sandiBaru, konfirmasi);
  if (galatSandi) return { error: galatSandi };

  const tidakValid = { error: "Tautan reset tidak valid atau sudah kedaluwarsa." };
  if (typeof token !== "string" || !POLA_TOKEN.test(token)) return tidakValid;

  const kunciIp = `reset-token:${ambilIp(await headers())}`;
  const blokir = sisaBlokirMs(kunciIp, 10);
  if (blokir > 0) return terlaluBanyak(blokir);

  const user = await prisma.user.findUnique({ where: { resetToken: hashRahasia(token) } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    catatPercobaan(kunciIp, LIMA_BELAS_MENIT_MS);
    return tidakValid;
  }

  const hash = await bcrypt.hash(sandiBaru, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { ok: true };
}

export async function buatTautanResetUntukDosen(permintaanId: string): Promise<HasilTautanReset> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Hanya admin yang boleh membuat tautan reset." };
  }

  const permintaan = await prisma.permintaanResetSandi.findUnique({
    where: { id: String(permintaanId) },
    include: { user: true },
  });
  if (!permintaan || permintaan.status === "SELESAI") {
    return { error: "Permintaan tidak ditemukan atau sudah selesai diproses." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MASA_TAUTAN_MS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: permintaan.userId },
      data: { resetToken: hashRahasia(token), resetTokenExpiresAt: expiresAt },
    }),
    prisma.permintaanResetSandi.update({
      where: { id: permintaan.id },
      data: { status: "SELESAI", selesaiAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    link: `/reset-sandi/${token}`,
    namaDosen: permintaan.user.username,
    berlakuMenit: MASA_TAUTAN_MS / 60_000,
  };
}
