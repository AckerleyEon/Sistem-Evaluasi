"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hitungUlangSemuaProfilLulusan } from "@/lib/perhitungan/hitungUlangMataKuliah";

const POLA_KODE_PL = /^PL-\d{2,3}$/;

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola Profil Lulusan.");
  }
}

function ambilData(formData: FormData) {
  const kode = String(formData.get("kode") ?? "").trim().toUpperCase();
  const nama = String(formData.get("nama") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const cplIds = [...new Set(formData.getAll("cplIds").filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (!POLA_KODE_PL.test(kode)) {
    return { error: "Format kode harus PL- diikuti 2-3 digit, contoh PL-01." } as const;
  }
  if (!nama || nama.length > 150) {
    return { error: "Nama Profil Lulusan wajib diisi dan maksimal 150 karakter." } as const;
  }
  if (!deskripsi || deskripsi.length > 500) {
    return { error: "Deskripsi wajib diisi dan maksimal 500 karakter." } as const;
  }
  if (cplIds.length === 0) {
    return { error: "Pilih minimal satu CPL untuk dihitung sebagai nilai Profil Lulusan." } as const;
  }
  return { data: { kode, nama, deskripsi, cplIds } } as const;
}

async function validasiCpl(cplIds: string[]) {
  const jumlah = await prisma.cPL.count({ where: { id: { in: cplIds } } });
  return jumlah === cplIds.length;
}

function revalidasiHalaman() {
  revalidatePath("/admin/data-master/cpl");
  revalidatePath("/admin/laporan");
  revalidatePath("/dosen", "layout");
}

export async function createProfilLulusan(formData: FormData) {
  await pastikanAdmin();
  const hasil = ambilData(formData);
  if ("error" in hasil) return hasil;
  const { kode, nama, deskripsi, cplIds } = hasil.data;
  if (!(await validasiCpl(cplIds))) return { error: "Ada CPL terpilih yang tidak ditemukan." };
  const kodeAda = await prisma.profilLulusan.findUnique({ where: { kode }, select: { id: true } });
  if (kodeAda) return { error: `Kode ${kode} sudah digunakan.` };

  await prisma.profilLulusan.create({
    data: {
      kode,
      nama,
      deskripsi,
      cplTerkait: { create: cplIds.map((cplId) => ({ cplId })) },
    },
  });
  await hitungUlangSemuaProfilLulusan();
  revalidasiHalaman();
  return { ok: true, kode };
}

export async function updateProfilLulusan(id: string, formData: FormData) {
  await pastikanAdmin();
  if (typeof id !== "string" || !id.trim()) return { error: "Profil Lulusan tidak valid." };
  const hasil = ambilData(formData);
  if ("error" in hasil) return hasil;
  const { kode, nama, deskripsi, cplIds } = hasil.data;
  if (!(await validasiCpl(cplIds))) return { error: "Ada CPL terpilih yang tidak ditemukan." };
  const kodeAda = await prisma.profilLulusan.findFirst({
    where: { kode, id: { not: id } },
    select: { id: true },
  });
  if (kodeAda) return { error: `Kode ${kode} sudah digunakan.` };

  const profil = await prisma.profilLulusan.findUnique({ where: { id }, select: { id: true } });
  if (!profil) return { error: "Profil Lulusan tidak ditemukan." };
  await prisma.profilLulusan.update({
    where: { id },
    data: {
      kode,
      nama,
      deskripsi,
      cplTerkait: {
        deleteMany: {},
        create: cplIds.map((cplId) => ({ cplId })),
      },
    },
  });
  await hitungUlangSemuaProfilLulusan();
  revalidasiHalaman();
  return { ok: true, kode };
}

export async function deleteProfilLulusan(id: string) {
  await pastikanAdmin();
  if (typeof id !== "string" || !id.trim()) throw new Error("Profil Lulusan tidak valid.");
  await prisma.profilLulusan.delete({ where: { id } });
  await hitungUlangSemuaProfilLulusan();
  revalidasiHalaman();
  return { ok: true };
}
