"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { bagiProporsional, bobotKePersen } from "@/lib/asesmen-util";
import { pastikanPengelolaMK } from "@/lib/otorisasi";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

const MAKS_UKURAN_IMPOR = 5 * 1024 * 1024;

function teksSel(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    if ("text" in value) return String(value.text);
    return "";
  }
  return String(value);
}

type BarisAsesmen = {
  baris: number;
  nama: string;
  pertemuan: number;
  bobot: number;
  kodeSub: string[];
};

export async function imporAsesmenExcel(
  mataKuliahId: string,
  kelasId: string | null,
  formData: FormData,
): Promise<{ ok: boolean; pesan: string; jumlah?: number }> {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId ?? undefined);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, pesan: "Pilih template Excel yang sudah diisi." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, pesan: "Format file harus .xlsx." };
  if (file.size > MAKS_UKURAN_IMPOR) return { ok: false, pesan: "Ukuran file maksimal 5 MB." };

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, pesan: "File tidak bisa dibaca. Pastikan file .xlsx valid." };
  }

  const metadata = workbook.getWorksheet("_metadata");
  if (
    !metadata ||
    teksSel(metadata.getCell("A2").value) !== mataKuliahId ||
    teksSel(metadata.getCell("B2").value) !== akses.ta.id ||
    teksSel(metadata.getCell("C2").value) !== (akses.kelasId ?? "")
  ) {
    return { ok: false, pesan: "Template bukan untuk mata kuliah, tahun ajaran, atau kelas yang sedang dipilih." };
  }

  const worksheet = workbook.getWorksheet("Asesmen");
  if (!worksheet) return { ok: false, pesan: "Lembar Asesmen tidak ditemukan. Unduh template terbaru terlebih dahulu." };

  const kolom = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, index) => {
    const header = teksSel(cell.value).trim().toLowerCase().replace(/\s+/g, " ");
    if (header === "nama tugas") kolom.set("nama", index);
    if (header === "pertemuan ke") kolom.set("pertemuan", index);
    if (header === "bobot (%)") kolom.set("bobot", index);
    if (header === "kode sub-cpmk (pisahkan koma)") kolom.set("sub", index);
  });
  if (kolom.size !== 4) {
    return { ok: false, pesan: "Kolom template tidak sesuai. Unduh template asesmen terbaru." };
  }

  const baris: BarisAsesmen[] = [];
  worksheet.eachRow((row, nomor) => {
    if (nomor === 1) return;
    const nama = teksSel(row.getCell(kolom.get("nama")!).value).trim();
    const pertemuanTeks = teksSel(row.getCell(kolom.get("pertemuan")!).value).trim();
    const bobotTeks = teksSel(row.getCell(kolom.get("bobot")!).value).trim();
    const kodeTeks = teksSel(row.getCell(kolom.get("sub")!).value).trim();
    if (!nama && !pertemuanTeks && !bobotTeks && !kodeTeks) return;
    const pertemuan = Number(pertemuanTeks);
    const bobot = Number(bobotTeks.replace(",", "."));
    baris.push({
      baris: nomor,
      nama,
      pertemuan,
      bobot,
      kodeSub: kodeTeks.split(/[,;\n]/).map((kode) => kode.trim()).filter(Boolean),
    });
  });
  if (baris.length === 0) return { ok: false, pesan: "Belum ada baris asesmen yang diisi." };
  if (baris.length > 100) return { ok: false, pesan: "Maksimal 100 tugas per impor." };

  const namaTerpakai = new Set<string>();
  for (const item of baris) {
    if (!item.nama) return { ok: false, pesan: `Nama tugas wajib diisi pada baris ${item.baris}.` };
    if (item.nama.length > 120) return { ok: false, pesan: `Nama tugas pada baris ${item.baris} maksimal 120 karakter.` };
    const namaNormal = item.nama.toLocaleLowerCase("id");
    if (namaTerpakai.has(namaNormal)) return { ok: false, pesan: `Nama tugas duplikat pada baris ${item.baris}.` };
    namaTerpakai.add(namaNormal);
    if (!Number.isInteger(item.pertemuan) || item.pertemuan < 1 || item.pertemuan > 16) {
      return { ok: false, pesan: `Pertemuan pada baris ${item.baris} harus angka 1-16.` };
    }
    if (!Number.isInteger(item.bobot) || item.bobot < 1 || item.bobot > 99) {
      return { ok: false, pesan: `Bobot pada baris ${item.baris} harus angka bulat 1-99.` };
    }
    if (item.kodeSub.length === 0) return { ok: false, pesan: `Isi minimal satu kode Sub-CPMK pada baris ${item.baris}.` };
    if (new Set(item.kodeSub.map((kode) => kode.toLocaleUpperCase("id"))).size !== item.kodeSub.length) {
      return { ok: false, pesan: `Ada kode Sub-CPMK berulang pada baris ${item.baris}.` };
    }
  }

  const bobotImpor = baris.reduce((jumlah, item) => jumlah + item.bobot, 0);
  const [tugasLama, subCpmk] = await Promise.all([
    prisma.tugas.findMany({
      where: { mataKuliahId, tahunAjaranId: akses.ta.id, kelasId: akses.kelasId },
      select: { id: true, bobot: true, nama: true },
    }),
    prisma.subCPMK.findMany({
      where: { mataKuliahId, tahunAjaranId: akses.ta.id, cpmkTerkait: { some: {} } },
      select: { id: true, kode: true },
    }),
  ]);
  if (tugasLama.some((tugas) => namaTerpakai.has(tugas.nama.toLocaleLowerCase("id")))) {
    return { ok: false, pesan: "Nama tugas sudah digunakan pada mata kuliah/kelas ini. Gunakan nama yang berbeda." };
  }
  if (tugasLama.length === 0 && bobotImpor !== 100) {
    return { ok: false, pesan: `Belum ada tugas sebelumnya. Total bobot pada template harus 100% (saat ini ${bobotImpor}%).` };
  }
  if (tugasLama.length > 0 && bobotImpor >= 100) {
    return { ok: false, pesan: "Total bobot tugas baru harus kurang dari 100% agar tugas sebelumnya tetap mendapat bobot." };
  }

  const subByKode = new Map(subCpmk.map((item) => [item.kode.toLocaleUpperCase("id"), item]));
  const mappings: { baris: BarisAsesmen; subIds: string[] }[] = [];
  for (const item of baris) {
    const ids: string[] = [];
    for (const kode of item.kodeSub) {
      const sub = subByKode.get(kode.toLocaleUpperCase("id"));
      if (!sub) return { ok: false, pesan: `Kode Sub-CPMK "${kode}" pada baris ${item.baris} tidak ada di lembar Referensi atau bukan milik mata kuliah ini.` };
      ids.push(sub.id);
    }
    mappings.push({ baris: item, subIds: ids });
  }

  const bobotLamaBaru = tugasLama.length > 0
    ? bagiProporsional(tugasLama.map((item) => bobotKePersen(item.bobot)), 100 - bobotImpor)
    : [];
  await prisma.$transaction(async (tx) => {
    for (const [indeks, tugas] of tugasLama.entries()) {
      await tx.tugas.update({
        where: { id: tugas.id },
        data: { bobot: bobotLamaBaru[indeks] / 100 },
      });
    }

    for (const item of mappings) {
      const tugas = await tx.tugas.create({
        data: {
          nama: item.baris.nama,
          pertemuanKe: item.baris.pertemuan,
          bobot: item.baris.bobot / 100,
          mataKuliahId,
          tahunAjaranId: akses.ta.id,
          kelasId: akses.kelasId,
        },
        select: { id: true },
      });
      await tx.distribusiSubCPMK.createMany({
        data: item.subIds.map((subCpmkId) => ({ subCpmkId, tugasId: tugas.id, sumber: "MANUAL" as const })),
      });
    }
  });

  await hitungUlangMataKuliah(mataKuliahId, akses.ta.id);
  revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  return { ok: true, pesan: `${baris.length} tugas berhasil diimpor dan dipetakan ke Sub-CPMK.`, jumlah: baris.length };
}
