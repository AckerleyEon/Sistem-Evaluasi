"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { kirimEmailOtpResetSandi } from "@/lib/email";

export async function mintaResetSandi(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  if (!username) return { error: "Username wajib diisi." };

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) return { ok: true, mode: "tidak-ditemukan" as const };

  if (user.role === "DOSEN") {
    await prisma.permintaanResetSandi.create({ data: { userId: user.id } });
    return { ok: true, mode: "diteruskan-ke-admin" as const };
  }

  // role ADMIN — kirim kode OTP ke email terverifikasi
  if (!user.email) {
    return { error: "Akun Admin ini belum memiliki email terverifikasi. Hubungi pengembang sistem untuk menambahkannya." };
  }

  const kodeOtp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

  await prisma.user.update({
    where: { id: user.id },
    data: { otpKode: kodeOtp, otpExpiresAt: expiresAt },
  });

  try {
    await kirimEmailOtpResetSandi(user.email, kodeOtp);
  } catch (err) {
    console.error("Gagal mengirim email OTP:", err);
    return { error: "Gagal mengirim email. Coba lagi beberapa saat, atau hubungi pengembang sistem." };
  }

  return { ok: true, mode: "otp-terkirim" as const, username: user.username };
}

export async function resetSandiDenganOtp(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const kodeOtp = (formData.get("kodeOtp") as string)?.trim();
  const sandiBaru = formData.get("sandiBaru") as string;
  const konfirmasi = formData.get("konfirmasi") as string;

  if (!username || !kodeOtp) return { error: "Username dan kode OTP wajib diisi." };
  if (!sandiBaru || sandiBaru.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (sandiBaru !== konfirmasi) return { error: "Konfirmasi kata sandi tidak cocok." };

  const user = await prisma.user.findUnique({ where: { username } });
  if (
    !user ||
    user.otpKode !== kodeOtp ||
    !user.otpExpiresAt ||
    user.otpExpiresAt < new Date()
  ) {
    return { error: "Kode OTP salah atau sudah kedaluwarsa." };
  }

  const hash = await bcrypt.hash(sandiBaru, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, otpKode: null, otpExpiresAt: null },
  });

  return { ok: true };
}

// Jalur Dosen — tidak berubah, tetap pakai link yang disalin manual oleh Admin
export async function resetSandiDenganToken(token: string, formData: FormData) {
  const sandiBaru = formData.get("sandiBaru") as string;
  const konfirmasi = formData.get("konfirmasi") as string;

  if (!sandiBaru || sandiBaru.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (sandiBaru !== konfirmasi) return { error: "Konfirmasi kata sandi tidak cocok." };

  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return { error: "Tautan reset tidak valid atau sudah kedaluwarsa." };
  }

  const hash = await bcrypt.hash(sandiBaru, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { ok: true };
}

export async function buatTautanResetUntukDosen(permintaanId: string) {
  const permintaan = await prisma.permintaanResetSandi.findUnique({
    where: { id: permintaanId },
    include: { user: true },
  });
  if (!permintaan || permintaan.status === "SELESAI") {
    return { error: "Permintaan tidak ditemukan atau sudah selesai diproses." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: permintaan.userId },
      data: { resetToken: token, resetTokenExpiresAt: expiresAt },
    }),
    prisma.permintaanResetSandi.update({
      where: { id: permintaanId },
      data: { status: "SELESAI", selesaiAt: new Date() },
    }),
  ]);

  return { ok: true, link: `/reset-sandi/${token}`, namaDosen: permintaan.user.username };
}