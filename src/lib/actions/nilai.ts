"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
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

export type BarisImporNilai = {
  baris: number;
  nim: string;
  nama: string | null;
  nilai: number | null;
  mahasiswaId: string | null;
  pesan: string | null;
};

export async function analisisImporNilai(
  mataKuliahId: string,
  kelasId: string | null,
  tugasId: string,
  formData: FormData,
): Promise<{ ok: true; baris: BarisImporNilai[] } | { ok: false; error: string }> {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId ?? undefined);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Format file harus .xlsx." };
  if (file.size > MAKS_UKURAN_IMPOR) return { ok: false, error: "Ukuran file maksimal 5 MB." };

  const whereTugas = {
    id: tugasId,
    mataKuliahId,
    tahunAjaranId: akses.ta.id,
    ...(akses.kelasId
      ? { OR: [{ kelasId: akses.kelasId }, ...(akses.koordinator ? [{ kelasId: null }] : [])] }
      : {}),
  };
  const tugas = await prisma.tugas.findFirst({ where: whereTugas, select: { id: true, kelasId: true } });
  if (!tugas) return { ok: false, error: "Tugas tidak tersedia untuk mata kuliah atau kelas ini." };

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, error: "File tidak bisa dibaca. Pastikan file .xlsx valid." };
  }

  const metadata = workbook.getWorksheet("_metadata");
  if (metadata) {
    const metadataCocok =
      teksSel(metadata.getCell("A2").value) === mataKuliahId &&
      teksSel(metadata.getCell("B2").value) === akses.ta.id &&
      teksSel(metadata.getCell("C2").value) === (akses.kelasId ?? "") &&
      teksSel(metadata.getCell("D2").value) === tugasId;
    if (!metadataCocok) {
      return { ok: false, error: "Template bukan untuk mata kuliah, tahun ajaran, kelas, atau tugas yang dipilih." };
    }
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { ok: false, error: "File tidak memiliki lembar kerja." };
  const kolom = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, index) => {
    const header = teksSel(cell.value).trim().toLowerCase().replace(/\s+/g, " ");
    if (["nim", "nim mahasiswa"].includes(header)) kolom.set("nim", index);
    if (["nilai", "skor", "nilai tugas"].includes(header)) kolom.set("nilai", index);
  });
  if (!kolom.has("nim") || !kolom.has("nilai")) {
    return { ok: false, error: "Header Excel harus memiliki kolom NIM dan Nilai." };
  }

  const entriExcel: { baris: number; nim: string; nilaiTeks: string }[] = [];
  worksheet.eachRow((row, nomor) => {
    if (nomor === 1) return;
    const nim = teksSel(row.getCell(kolom.get("nim")!).value).trim();
    const nilaiTeks = teksSel(row.getCell(kolom.get("nilai")!).value).trim();
    if (!nim || !nilaiTeks) return;
    entriExcel.push({ baris: nomor, nim, nilaiTeks });
  });
  if (entriExcel.length === 0) return { ok: false, error: "Tidak ada data nilai pada file." };
  if (entriExcel.length > 500) return { ok: false, error: "Maksimal 500 baris per impor." };

  const pendaftaran = await prisma.pendaftaranMK.findMany({
    where: { mataKuliahId, tahunAjaranId: akses.ta.id, ...(akses.kelasId ? { kelasId: akses.kelasId } : {}) },
    select: { mahasiswaId: true, kelasId: true, mahasiswa: { select: { nim: true, nama: true } } },
  });
  const mahasiswaPerNim = new Map(pendaftaran.map((item) => [item.mahasiswa.nim, {
    id: item.mahasiswaId,
    nama: item.mahasiswa.nama,
    kelasId: item.kelasId,
  }]));
  const frekuensiNim = new Map<string, number>();
  for (const entri of entriExcel) {
    if (entri.nim) frekuensiNim.set(entri.nim, (frekuensiNim.get(entri.nim) ?? 0) + 1);
  }

  return {
    ok: true,
    baris: entriExcel.map((entri) => {
      const siswa = mahasiswaPerNim.get(entri.nim);
      const nilai = Number(entri.nilaiTeks.replace(",", "."));
      let pesan: string | null = null;
      if (!entri.nim) pesan = "NIM wajib diisi.";
      else if (frekuensiNim.get(entri.nim)! > 1) pesan = "NIM muncul lebih dari sekali.";
      else if (!siswa) pesan = "Mahasiswa tidak terdaftar pada mata kuliah/kelas ini.";
      else if (tugas.kelasId !== null && siswa.kelasId !== tugas.kelasId) pesan = "Mahasiswa tidak terdaftar di kelas tugas ini.";
      else if (!entri.nilaiTeks || !Number.isFinite(nilai) || nilai < 0 || nilai > 100) {
        pesan = "Nilai harus berupa angka 0–100.";
      }
      return {
        baris: entri.baris,
        nim: entri.nim,
        nama: siswa?.nama ?? null,
        nilai: pesan ? null : nilai,
        mahasiswaId: pesan ? null : siswa?.id ?? null,
        pesan,
      };
    }),
  };
}

export async function simpanNilaiMassal(
  mataKuliahId: string,
  kelasId: string | null,
  tugasId: string,
  formData: FormData,
) {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId ?? undefined);
  const { ta } = akses;

  const entri: { mahasiswaId: string; skor: number }[] = [];
  const hapus: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("hapus-") && value === "on") {
      hapus.push(key.slice("hapus-".length));
      continue;
    }
    if (!key.startsWith("skor-")) continue;

    const teks = String(value).trim();
    if (teks === "") continue; // sel kosong dilewati, bukan dianggap 0

    const skor = Number(teks);
    if (!Number.isFinite(skor) || skor < 0 || skor > 100 || Math.abs(skor * 10 - Math.round(skor * 10)) > 1e-8) {
      throw new Error(`Skor tidak valid: "${teks}" (harus angka 0-100 dengan maksimal satu angka desimal).`);
    }

    const mahasiswaId = key.slice("skor-".length);
    entri.push({ mahasiswaId, skor });
  }

  const whereTugas = {
    id: tugasId,
    mataKuliahId,
    tahunAjaranId: ta.id,
    ...(akses.kelasId
      ? { OR: [{ kelasId: akses.kelasId }, ...(akses.koordinator ? [{ kelasId: null }] : [])] }
      : {}),
  };
  const [tugasValid, terdaftar] = await Promise.all([
    prisma.tugas.findMany({ where: whereTugas, select: { id: true, kelasId: true } }),
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, ...(akses.kelasId ? { kelasId: akses.kelasId } : {}) },
      select: { mahasiswaId: true, kelasId: true },
    }),
  ]);
  const tugasValidId = tugasValid[0];
  if (!tugasValidId) throw new Error("Tugas tidak tersedia untuk mata kuliah atau kelas ini.");
  const kelasPerMahasiswa = new Map(terdaftar.map((p) => [p.mahasiswaId, p.kelasId]));
  const idMahasiswa = new Set(kelasPerMahasiswa.keys());

  if (
    [...entri.map((e) => e.mahasiswaId), ...hapus].some(
      (mahasiswaId) =>
        !idMahasiswa.has(mahasiswaId) ||
        (tugasValidId.kelasId !== null && kelasPerMahasiswa.get(mahasiswaId) !== tugasValidId.kelasId),
    )
  ) {
    throw new Error("Ada nilai untuk tugas atau mahasiswa yang tidak terdaftar pada mata kuliah ini.");
  }

  if (entri.length || hapus.length) {
    await prisma.$transaction([
      ...entri.map((e) =>
      prisma.nilai.upsert({
        where: { mahasiswaId_tugasId: { mahasiswaId: e.mahasiswaId, tugasId } },
        create: { mahasiswaId: e.mahasiswaId, tugasId, tahunAjaranId: ta.id, skor: e.skor },
        update: { skor: e.skor },
      })),
      ...(hapus.length
        ? [prisma.nilai.deleteMany({ where: { mahasiswaId: { in: hapus }, tugasId } })]
        : []),
    ]);
  }

  const nilaiTersimpan = entri.length
    ? await prisma.nilai.findMany({
          where: {
            tugasId,
            mahasiswaId: { in: entri.map((item) => item.mahasiswaId) },
            tahunAjaranId: ta.id,
          },
          select: { mahasiswaId: true, skor: true },
        })
    : [];
  const nilaiPerMahasiswa = new Map(nilaiTersimpan.map((item) => [item.mahasiswaId, item.skor]));
  const belumTersimpan = entri.find((item) => nilaiPerMahasiswa.get(item.mahasiswaId) !== item.skor);
  if (belumTersimpan) {
    throw new Error("Sebagian nilai belum terkonfirmasi tersimpan. Muat ulang data dan coba kembali.");
  }

  await hitungUlangMataKuliah(mataKuliahId, ta.id);

  revalidatePath(`/dosen/input-nilai/${mataKuliahId}`);
  revalidatePath(`/dosen/hasil/${mataKuliahId}`);
  return { ok: true, tersimpan: entri.length, dihapus: hapus.length };
}