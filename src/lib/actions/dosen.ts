"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type HasilAksi = { error?: string; nip?: string; passwordSementara?: string };

const POLA_NIP = /^\d{8,20}$/;
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola akun dosen.");
  }
}

function buatPasswordSementara(panjang = 10) {
  let hasil = "";
  for (let i = 0; i < panjang; i++) hasil += ALFABET[crypto.randomInt(ALFABET.length)];
  return hasil;
}

export async function createDosen(formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const nama = ((formData.get("nama") as string) ?? "").trim();
  const gelar = ((formData.get("gelar") as string) ?? "").trim() || null;
  const nip = ((formData.get("nip") as string) ?? "").trim();

  if (!nama) return { error: "Nama lengkap wajib diisi." };
  if (nama.length > 120) return { error: "Nama lengkap maksimal 120 karakter." };
  if (!POLA_NIP.test(nip)) return { error: "NIP harus berupa angka (8-20 digit)." };

  const [dosenAda, usernameAda] = await Promise.all([
    prisma.dosen.findUnique({ where: { nip } }),
    prisma.user.findUnique({ where: { username: nip } }),
  ]);
  if (dosenAda || usernameAda) return { error: `NIP ${nip} sudah terdaftar.` };

  const passwordSementara = buatPasswordSementara();
  const hash = await bcrypt.hash(passwordSementara, 10);

  try {
    await prisma.user.create({
      data: {
        username: nip,
        password: hash,
        role: "DOSEN",
        dosen: { create: { nama, gelar, nip } },
      },
    });
  } catch {
    return { error: "Gagal menyimpan akun. NIP mungkin baru saja didaftarkan, coba lagi." };
  }

  revalidatePath("/admin/dosen");
  return { nip, passwordSementara };
}

export async function updateDosen(id: string, formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const nama = ((formData.get("nama") as string) ?? "").trim();
  const gelar = ((formData.get("gelar") as string) ?? "").trim() || null;

  if (!nama) return { error: "Nama lengkap wajib diisi." };
  if (nama.length > 120) return { error: "Nama lengkap maksimal 120 karakter." };

  await prisma.dosen.update({ where: { id }, data: { nama, gelar } });

  revalidatePath("/admin/dosen");
  return {};
}

export async function cekPenugasanDosen(id: string): Promise<string[]> {
  await pastikanAdmin();

  const penugasan = await prisma.penugasanDosenMK.findMany({
    where: { dosenId: id },
    include: { mataKuliah: true, tahunAjaran: true },
    orderBy: { tahunAjaran: { label: "desc" } },
  });

  return penugasan.map((p) => `${p.mataKuliah.kode} ${p.mataKuliah.nama} (T.A. ${p.tahunAjaran.label})`);
}

export async function deleteDosen(id: string): Promise<HasilAksi> {
  await pastikanAdmin();

  const dosen = await prisma.dosen.findUnique({
    where: { id },
    include: { _count: { select: { penugasan: true } } },
  });
  if (!dosen) return { error: "Akun dosen tidak ditemukan." };
  if (dosen._count.penugasan > 0) {
    return { error: "Dosen ini masih tercatat mengampu mata kuliah. Lepas penugasannya dulu." };
  }

  // Dosen dihapus dulu, baru akun login-nya (Dosen.userId menunjuk ke User).
  await prisma.$transaction([
    prisma.dosen.delete({ where: { id } }),
    prisma.user.delete({ where: { id: dosen.userId } }),
  ]);

  revalidatePath("/admin/dosen");
  return {};
}

export async function gantiSandiDosen(id: string, formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const sandi = (formData.get("sandi") as string) ?? "";
  if (sandi.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (sandi.length > 64) return { error: "Kata sandi maksimal 64 karakter." };

  const dosen = await prisma.dosen.findUnique({ where: { id } });
  if (!dosen) return { error: "Akun dosen tidak ditemukan." };

  const hash = await bcrypt.hash(sandi, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: dosen.userId },
      data: { password: hash, resetToken: null, resetTokenExpiresAt: null },
    }),
    prisma.permintaanResetSandi.updateMany({
      where: { userId: dosen.userId, status: "MENUNGGU" },
      data: { status: "SELESAI", selesaiAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/dosen");
  revalidatePath("/admin/permintaan-reset");
  return {};
}