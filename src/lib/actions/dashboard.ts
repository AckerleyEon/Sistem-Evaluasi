"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KUNCI_PASSING_GRADE, ambilDashboard } from "@/lib/dashboard";

type Hasil = { ok: boolean; pesan: string };

async function pastikanAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function simpanPassingGrade(nilai: number): Promise<Hasil> {
  if (!(await pastikanAdmin())) return { ok: false, pesan: "Hanya admin yang boleh mengubah batas bawah nilai." };
  if (!Number.isInteger(nilai) || nilai < 50 || nilai > 100) {
    return { ok: false, pesan: "Batas bawah harus bilangan bulat antara 50 dan 100." };
  }
  await prisma.pengaturan.upsert({
    where: { kunci: KUNCI_PASSING_GRADE },
    update: { nilai: String(nilai) },
    create: { kunci: KUNCI_PASSING_GRADE, nilai: String(nilai) },
  });
  revalidatePath("/admin");
  return { ok: true, pesan: `Batas bawah nilai CPL diterapkan: ${nilai}%.` };
}

// Menghitung dosen yang belum 100%. Pengiriman email belum dihubungkan ke src/lib/email.ts
// (seed dosen juga belum punya email), jadi saat ini hanya mengembalikan jumlah penerimanya.
export async function kirimPengingatDosen(taId: string): Promise<Hasil & { jumlah: number }> {
  if (!(await pastikanAdmin())) return { ok: false, jumlah: 0, pesan: "Tidak diizinkan." };
  const data = await ambilDashboard(taId);
  const jumlah = data?.jumlahDosenPerluPengingat ?? 0;
  return {
    ok: true,
    jumlah,
    pesan: jumlah
      ? `${jumlah} dosen belum menyelesaikan input nilai. Pengiriman email belum dihubungkan.`
      : "Semua dosen sudah menyelesaikan input nilai.",
  };
}
