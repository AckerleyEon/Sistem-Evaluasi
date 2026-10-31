"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pastikanPengelolaMK } from "@/lib/otorisasi";
import { distribusikanSeimbang } from "@/lib/distribusi/roundRobin";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

const urut = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export async function finalisasiDistribusi(formData: FormData) {
  const mataKuliahId = formData.get("mataKuliahId") as string;
  const kelasId = formData.get("kelasId") as string;
  const { ta } = await pastikanPengelolaMK(mataKuliahId, kelasId);

  const daftarTugas = await prisma.tugas.findMany({
    where: { mataKuliahId, tahunAjaranId: ta.id, kelasId },
    orderBy: { pertemuanKe: "asc" },
  });

  // Rebalance otomatis hanya untuk kelas ini. Pemetaan manual tetap dipertahankan.
  await prisma.distribusiSubCPMK.deleteMany({
    where: { sumber: "OTOMATIS", tugas: { mataKuliahId, tahunAjaranId: ta.id, kelasId } },
  });

  if (daftarTugas.length > 0) {
    const kandidat = await prisma.subCPMK.findMany({
      where: {
        mataKuliahId,
        tahunAjaranId: ta.id,
        cpmkTerkait: { some: {} },
      },
      include: { cpmkTerkait: { include: { cpmk: true } } },
    });
    const [manual, subManual] = await Promise.all([
      prisma.distribusiSubCPMK.groupBy({
        by: ["tugasId"],
        where: { sumber: "MANUAL", tugas: { mataKuliahId, tahunAjaranId: ta.id, kelasId } },
        _count: { tugasId: true },
      }),
      prisma.distribusiSubCPMK.findMany({
        where: { sumber: "MANUAL", tugas: { mataKuliahId, tahunAjaranId: ta.id, kelasId } },
        select: { subCpmkId: true },
        distinct: ["subCpmkId"],
      }),
    ]);
    const subManualId = new Set(subManual.map((item) => item.subCpmkId));
    const sisa = kandidat.filter((item) => !subManualId.has(item.id));

    const kodeInduk = (s: { cpmkTerkait: { cpmk: { kode: string } }[] }) =>
      s.cpmkTerkait.map((t) => t.cpmk.kode).sort(urut)[0] ?? "";
    sisa.sort((a, b) => urut(kodeInduk(a), kodeInduk(b)) || urut(a.kode, b.kode));

    if (sisa.length > 0) {
      const jumlahAwal = new Map<string, number>(manual.map((r) => [r.tugasId, r._count.tugasId]));

      const hasil = distribusikanSeimbang(sisa, daftarTugas, jumlahAwal);
      await prisma.distribusiSubCPMK.createMany({
        data: hasil.map(({ item, tujuan }) => ({
          subCpmkId: item.id,
          tugasId: tujuan.id,
          sumber: "OTOMATIS" as const,
        })),
      });
    }
  }

  await hitungUlangMataKuliah(mataKuliahId, ta.id);

  revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  redirect(`/dosen/komponen-penilaian/${mataKuliahId}?kelas=${encodeURIComponent(kelasId)}`);
}