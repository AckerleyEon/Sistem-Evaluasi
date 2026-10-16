"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pastikanPengelolaMK } from "@/lib/otorisasi";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

export async function simpanNilaiMassal(mataKuliahId: string, formData: FormData) {
  const { ta } = await pastikanPengelolaMK(mataKuliahId);

  const entri: { mahasiswaId: string; tugasId: string; skor: number }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("skor-")) continue;

    const teks = String(value).trim();
    if (teks === "") continue; // sel kosong dilewati, bukan dianggap 0

    const skor = Number(teks);
    if (Number.isNaN(skor) || skor < 0 || skor > 100) {
      throw new Error(`Skor tidak valid: "${teks}" (harus angka 0-100).`);
    }

    const [, mahasiswaId, tugasId] = key.split("-");
    entri.push({ mahasiswaId, tugasId, skor });
  }

  const [tugasValid, terdaftar] = await Promise.all([
    prisma.tugas.findMany({ where: { mataKuliahId, tahunAjaranId: ta.id }, select: { id: true } }),
    prisma.pendaftaranMK.findMany({ where: { mataKuliahId, tahunAjaranId: ta.id }, select: { mahasiswaId: true } }),
  ]);
  const idTugas = new Set(tugasValid.map((t) => t.id));
  const idMahasiswa = new Set(terdaftar.map((p) => p.mahasiswaId));

  if (entri.some((e) => !idTugas.has(e.tugasId) || !idMahasiswa.has(e.mahasiswaId))) {
    throw new Error("Ada nilai untuk tugas atau mahasiswa yang tidak terdaftar pada mata kuliah ini.");
  }

  await prisma.$transaction(
    entri.map((e) =>
      prisma.nilai.upsert({
        where: { mahasiswaId_tugasId: { mahasiswaId: e.mahasiswaId, tugasId: e.tugasId } },
        create: { mahasiswaId: e.mahasiswaId, tugasId: e.tugasId, tahunAjaranId: ta.id, skor: e.skor },
        update: { skor: e.skor },
      })
    )
  );

  await hitungUlangMataKuliah(mataKuliahId, ta.id);

  revalidatePath(`/dosen/input-nilai/${mataKuliahId}`);
  redirect(`/dosen/input-nilai/${mataKuliahId}`);
}