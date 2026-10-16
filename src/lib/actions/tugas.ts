"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pastikanPengelolaMK } from "@/lib/otorisasi";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

export async function createTugas(mataKuliahId: string, formData: FormData) {
  const { ta } = await pastikanPengelolaMK(mataKuliahId);

  const nama = ((formData.get("nama") as string) ?? "").trim();
  const pertemuanKe = Number(formData.get("pertemuanKe"));
  const bobot = Number(formData.get("bobot"));
  const subCpmkManualIds = formData.getAll("subCpmkManual") as string[];

  if (!nama) throw new Error("Nama tugas wajib diisi.");
  if (!Number.isInteger(pertemuanKe) || pertemuanKe < 1) throw new Error("Pertemuan ke harus bilangan bulat minimal 1.");
  if (Number.isNaN(bobot) || bobot < 0) throw new Error("Bobot tidak boleh negatif.");

  const tugasBaru = await prisma.tugas.create({
    data: { nama, pertemuanKe, bobot, mataKuliahId, tahunAjaranId: ta.id },
  });

  if (subCpmkManualIds.length > 0) {
    // Hanya Sub-CPMK milik mata kuliah dan T.A. ini yang boleh dikaitkan.
    const subValid = await prisma.subCPMK.findMany({
      where: {
        id: { in: subCpmkManualIds },
        cpmkTerkait: { some: { cpmk: { mataKuliahId, tahunAjaranId: ta.id } } },
      },
      select: { id: true },
    });
    if (subValid.length > 0) {
      await prisma.distribusiSubCPMK.createMany({
        data: subValid.map((s) => ({ subCpmkId: s.id, tugasId: tugasBaru.id, sumber: "MANUAL" as const })),
      });
    }
  }

  await hitungUlangMataKuliah(mataKuliahId, ta.id);

  revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  redirect(`/dosen/komponen-penilaian/${mataKuliahId}`);
}

export async function deleteTugas(mataKuliahId: string, formData: FormData) {
  const { ta } = await pastikanPengelolaMK(mataKuliahId);

  const id = formData.get("id") as string;
  const tugas = await prisma.tugas.findFirst({ where: { id, mataKuliahId, tahunAjaranId: ta.id } });
  if (!tugas) throw new Error("Tugas tidak ditemukan.");

  await prisma.tugas.delete({ where: { id } });
  await hitungUlangMataKuliah(mataKuliahId, ta.id);

  revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
}