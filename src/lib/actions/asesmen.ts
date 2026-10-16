"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dosenSaatIni, tahunAjaranAktif } from "@/lib/asesmen";
import { angkaKode, bagiProporsional, bobotKePersen } from "@/lib/asesmen-util";
// Hitung ulang HasilSubCPMK/HasilCPMK/HasilCPL setelah bobot atau pemetaan tugas berubah.
// ASUMSI signature: (mataKuliahId, tahunAjaranId). Sesuaikan dengan file aslimu.
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";
import type { HasilAksi, RingkasanBuat } from "@/components/dosen/asesmen/tipe";

type Konteks = { dosenId: string; tahunAjaranId: string };

async function pastikanPengampu(mataKuliahId: string): Promise<Konteks | { galat: string }> {
  const dosen = await dosenSaatIni();
  if (!dosen) return { galat: "Sesi tidak valid. Silakan login ulang sebagai dosen." };
  const ta = await tahunAjaranAktif();
  if (!ta) return { galat: "Belum ada tahun ajaran aktif." };
  const penugasan = await prisma.penugasanDosenMK.findUnique({
    where: { mataKuliahId_tahunAjaranId: { mataKuliahId, tahunAjaranId: ta.id } },
  });
  if (!penugasan || penugasan.dosenId !== dosen.id) return { galat: "Kamu bukan pengampu mata kuliah ini." };
  return { dosenId: dosen.id, tahunAjaranId: ta.id };
}

export interface InputBuatTugas {
  mataKuliahId: string;
  nama: string;
  pertemuanKe: number;
  bobot: number; // persen bulat
  subCpmkIds: string[];
}

export async function buatTugas(input: InputBuatTugas): Promise<HasilAksi & { ringkasan?: RingkasanBuat }> {
  const k = await pastikanPengampu(input.mataKuliahId);
  if ("galat" in k) return { ok: false, pesan: k.galat };

  const nama = input.nama.trim();
  if (!nama) return { ok: false, pesan: "Judul tugas wajib diisi." };
  if (nama.length > 120) return { ok: false, pesan: "Judul tugas maksimal 120 karakter." };
  if (!Number.isInteger(input.pertemuanKe) || input.pertemuanKe < 1 || input.pertemuanKe > 16) {
    return { ok: false, pesan: "Pertemuan ke- harus antara 1 dan 16." };
  }
  const subIds = [...new Set(input.subCpmkIds)];
  if (subIds.length === 0) return { ok: false, pesan: "Pilih minimal satu Sub-CPMK." };

  const subValid = await prisma.subCPMK.findMany({
    where: {
      id: { in: subIds },
      tahunAjaranId: k.tahunAjaranId,
      mataKuliahId: input.mataKuliahId, // Sub-CPMK dimiliki satu MK
    },
    select: { id: true },
  });
  if (subValid.length !== subIds.length) return { ok: false, pesan: "Ada Sub-CPMK yang bukan milik mata kuliah ini." };

  const hasil = await prisma.$transaction(async (tx) => {
    const lama = await tx.tugas.findMany({
      where: { mataKuliahId: input.mataKuliahId, tahunAjaranId: k.tahunAjaranId },
      orderBy: { id: "asc" },
    });

    // Tugas pertama otomatis 100%. Selanjutnya 1..99 dan tugas lain diskalakan agar total tetap 100.
    const bobotBaru = lama.length === 0 ? 100 : Math.min(99, Math.max(1, Math.round(input.bobot)));
    if (lama.length > 0) {
      const baru = bagiProporsional(lama.map((t) => bobotKePersen(t.bobot)), 100 - bobotBaru);
      for (const [i, t] of lama.entries()) {
        await tx.tugas.update({ where: { id: t.id }, data: { bobot: baru[i] / 100 } });
      }
    }

    const tugas = await tx.tugas.create({
      data: {
        nama,
        pertemuanKe: input.pertemuanKe,
        bobot: bobotBaru / 100,
        mataKuliahId: input.mataKuliahId,
        tahunAjaranId: k.tahunAjaranId,
      },
    });
    await tx.distribusiSubCPMK.createMany({
      data: subIds.map((subCpmkId) => ({ subCpmkId, tugasId: tugas.id, sumber: "MANUAL" as const })),
    });
    return { tugas, bobotBaru };
  });

  await hitungUlangMataKuliah(input.mataKuliahId, k.tahunAjaranId);
  revalidatePath(`/dosen/komponen-penilaian/${input.mataKuliahId}`);

  const cpmkTerkait = await prisma.cPMK.findMany({
    where: {
      mataKuliahId: input.mataKuliahId,
      tahunAjaranId: k.tahunAjaranId,
      sub: { some: { subCpmkId: { in: subIds } } },
    },
    select: { kode: true },
  });
  const cpmkAngka: string[] = cpmkTerkait
    .map((c: { kode: string }) => angkaKode(c.kode))
    .sort((a: string, b: string) => Number(a) - Number(b));
  return {
    ok: true,
    pesan: "Tugas berhasil disimpan dan dipetakan.",
    ringkasan: { id: hasil.tugas.id, nama, bobot: hasil.bobotBaru, cpmkAngka },
  };
}

export async function hapusTugas(mataKuliahId: string, tugasId: string): Promise<HasilAksi> {
  const k = await pastikanPengampu(mataKuliahId);
  if ("galat" in k) return { ok: false, pesan: k.galat };

  const ada = await prisma.tugas.findFirst({
    where: { id: tugasId, mataKuliahId, tahunAjaranId: k.tahunAjaranId },
    select: { id: true, nama: true },
  });
  if (!ada) return { ok: false, pesan: "Tugas tidak ditemukan." };

  await prisma.$transaction(async (tx) => {
    // Nilai dan distribusi ikut terhapus (onDelete: Cascade).
    await tx.tugas.delete({ where: { id: tugasId } });
    const sisa = await tx.tugas.findMany({
      where: { mataKuliahId, tahunAjaranId: k.tahunAjaranId },
      orderBy: { id: "asc" },
    });
    if (sisa.length > 0) {
      const baru = bagiProporsional(sisa.map((t) => bobotKePersen(t.bobot)), 100);
      for (const [i, t] of sisa.entries()) {
        await tx.tugas.update({ where: { id: t.id }, data: { bobot: baru[i] / 100 } });
      }
    }
  });

  await hitungUlangMataKuliah(mataKuliahId, k.tahunAjaranId);
  revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  return { ok: true, pesan: `"${ada.nama}" dihapus. Bobot tugas lain disesuaikan agar total tetap 100%.` };
}