"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cekAksesMK, pastikanPengelolaMK } from "@/lib/otorisasi";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";
import { normalisasiNamespaceWorkbookExcel } from "@/lib/asesmen-impor-util";
import {
  BATAS_IMPOR_NILAI,
  bacaKodeMataKuliahDariNamaFile,
  buatNamaFileNilai,
  bacaNilaiImpor,
  namaFileNilaiSesuai,
  normalisasiKodeMataKuliah,
  normalisasiHeaderNilai,
  normalisasiNamaSheetNilai,
  namaSheetNilai,
  petakanKolomNilai,
} from "@/lib/nilai-impor-util";

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
  file?: string;
  mataKuliah?: string;
  kelas?: string;
  tugas?: string;
  baris: number;
  nim: string;
  nama: string | null;
  nilai: number | null;
  nilaiSebelumnya?: number | null;
  mahasiswaId: string | null;
  mataKuliahId?: string;
  kelasId?: string;
  tugasId?: string;
  pesan: string | null;
};

export async function analisisImporNilai(
  mataKuliahId: string,
  kelasId: string,
  tugasId: string,
  formData: FormData,
): Promise<{ ok: true; baris: BarisImporNilai[] } | { ok: false; error: string }> {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Format file harus .xlsx." };
  if (file.size > MAKS_UKURAN_IMPOR) return { ok: false, error: "Ukuran file maksimal 5 MB." };

  const whereTugas = {
    id: tugasId,
    mataKuliahId,
    tahunAjaranId: akses.ta.id,
    kelasId: akses.kelasId,
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
      teksSel(metadata.getCell("C2").value) === akses.kelasId &&
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
    where: { mataKuliahId, tahunAjaranId: akses.ta.id, kelasId: akses.kelasId },
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
      else if (siswa.kelasId !== tugas.kelasId) pesan = "Mahasiswa tidak terdaftar di kelas tugas ini.";
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

export async function analisisImporNilaiBanyak(
  formData: FormData,
): Promise<{ ok: true; baris: BarisImporNilai[] } | { ok: false; error: string }> {
  const user = (await auth())?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "DOSEN")) {
    return { ok: false, error: "Sesi tidak valid atau Anda tidak berhak mengimpor nilai." };
  }
  const files = formData.getAll("files");
  if (!files.length || files.some((file) => !(file instanceof File) || file.size === 0)) {
    return { ok: false, error: "Pilih minimal satu workbook Excel (.xlsx)." };
  }
  if (files.length > BATAS_IMPOR_NILAI.jumlahFile) {
    return { ok: false, error: `Maksimal ${BATAS_IMPOR_NILAI.jumlahFile} file untuk satu kali impor.` };
  }
  const fileList = files.filter((file): file is File => file instanceof File);
  if (fileList.some((file) => !file.name.toLowerCase().endsWith(".xlsx"))) {
    return { ok: false, error: "Semua file harus berformat .xlsx." };
  }
  if (fileList.some((file) => file.size > BATAS_IMPOR_NILAI.ukuranPerFile)) {
    return { ok: false, error: "Ukuran setiap file maksimal 5 MB." };
  }
  if (fileList.reduce((total, file) => total + file.size, 0) > BATAS_IMPOR_NILAI.ukuranTotal) {
    return { ok: false, error: "Ukuran total file maksimal 20 MB." };
  }

  type LembarImpor = {
    file: string;
    mataKuliahId: string;
    tahunAjaranId: string;
    tugasId: string;
    kelasId: string;
    mataKuliah: string;
    kelas: string;
    tugas: string;
    baris: number;
    nim: string;
    nilaiTeks: string;
    kelasTeks: string;
  };
  const lembarImpor: LembarImpor[] = [];
  const mataKuliahTerpilih = new Set<string>();
  const daftarMataKuliah = await prisma.mataKuliah.findMany({
    select: { id: true, nama: true, kode: true },
  });

  for (const file of fileList) {
    let workbook: ExcelJS.Workbook;
    try {
      const bufferNormal = await normalisasiNamespaceWorkbookExcel(Buffer.from(await file.arrayBuffer()));
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bufferNormal as unknown as ExcelJS.Buffer);
    } catch (error) {
      console.error(`Gagal membaca workbook nilai "${file.name}".`, error);
      return { ok: false, error: `${file.name}: file tidak bisa dibaca. Pastikan workbook .xlsx valid.` };
    }

    const metadata = workbook.getWorksheet("_metadata");
    if (!metadata) {
      return { ok: false, error: `${file.name}: metadata template tidak ditemukan. Unduh template nilai per mata kuliah yang terbaru.` };
    }
    const metadataMataKuliahId = teksSel(metadata.getCell("A2").value).trim();
    const metadataTahunAjaranId = teksSel(metadata.getCell("B2").value).trim();
    const kodeMataKuliah = bacaKodeMataKuliahDariNamaFile(file.name);
    if (!kodeMataKuliah) {
      return { ok: false, error: `${file.name}: nama file harus mengikuti format KODEMK_NAMA-MK_nilai.xlsx.` };
    }
    const mataKuliahCocok = daftarMataKuliah.filter(
      (item) => normalisasiKodeMataKuliah(item.kode) === normalisasiKodeMataKuliah(kodeMataKuliah),
    );
    if (mataKuliahCocok.length > 1) {
      return { ok: false, error: `${file.name}: kode pada nama file cocok dengan lebih dari satu mata kuliah.` };
    }
    const mataKuliah = mataKuliahCocok[0];
    if (!mataKuliah) return { ok: false, error: `${file.name}: kode mata kuliah "${kodeMataKuliah}" tidak ditemukan.` };
    if (!namaFileNilaiSesuai(file.name, mataKuliah.kode, mataKuliah.nama)) {
      return {
        ok: false,
        error: `${file.name}: nama file harus mengikuti format ${buatNamaFileNilai(mataKuliah.kode, mataKuliah.nama)}.`,
      };
    }
    if (metadataMataKuliahId && metadataMataKuliahId !== mataKuliah.id) {
      return { ok: false, error: `${file.name}: mata kuliah pada metadata tidak cocok dengan kode pada nama file.` };
    }
    const aksesMK = await cekAksesMK(mataKuliah.id);
    if (!aksesMK || aksesMK.ta.status !== "AKTIF") {
      return { ok: false, error: `${file.name}: mata kuliah tidak dapat dikelola atau tahun ajarannya tidak aktif.` };
    }
    if (metadataTahunAjaranId && metadataTahunAjaranId !== aksesMK.ta.id) {
      return { ok: false, error: `${file.name}: template berasal dari tahun ajaran yang berbeda.` };
    }
    const mataKuliahId = mataKuliah.id;
    const tahunAjaranId = aksesMK.ta.id;
    if (mataKuliahTerpilih.has(mataKuliahId)) {
      return { ok: false, error: `${file.name}: pilih hanya satu workbook untuk setiap mata kuliah.` };
    }
    mataKuliahTerpilih.add(mataKuliahId);

    type PemetaanLembar = { sheet: string; tugasId: string; kelasId: string };
    const pemetaanLembar: PemetaanLembar[] = [];
    const metadataLama = normalisasiHeaderNilai(teksSel(metadata.getCell("D1").value)) === "tugasid";
    if (metadataLama) {
      const kelasId = teksSel(metadata.getCell("C2").value).trim();
      const tugasId = teksSel(metadata.getCell("D2").value).trim();
      const worksheet = workbook.getWorksheet("Nilai");
      if (!kelasId || !tugasId || !worksheet) {
        return { ok: false, error: `${file.name}: metadata tugas pada template lama tidak lengkap.` };
      }
      pemetaanLembar.push({ sheet: worksheet.name, tugasId, kelasId });
    } else {
      if (
        normalisasiHeaderNilai(teksSel(metadata.getCell("A4").value)) !== "sheet" ||
        normalisasiHeaderNilai(teksSel(metadata.getCell("B4").value)) !== "tugasid" ||
        normalisasiHeaderNilai(teksSel(metadata.getCell("C4").value)) !== "kelasid"
      ) {
        return { ok: false, error: `${file.name}: format metadata tidak sesuai. Unduh template nilai terbaru.` };
      }
      metadata.eachRow((row, nomor) => {
        if (nomor < 5) return;
        const sheet = teksSel(row.getCell(1).value).trim();
        const tugasId = teksSel(row.getCell(2).value).trim();
        const kelasId = teksSel(row.getCell(3).value).trim();
        if (sheet || tugasId || kelasId) pemetaanLembar.push({ sheet, tugasId, kelasId });
      });
    }
    if (pemetaanLembar.some((item) => !item.tugasId || !item.kelasId)) {
      const kelasTersedia = await prisma.kelasMK.findMany({
        where: {
          mataKuliahId,
          tahunAjaranId,
          ...(user.role === "DOSEN" && !aksesMK.koordinator
            ? { dosenId: user.dosenId ?? "" }
            : {}),
        },
        select: { id: true, nama: true },
      });
      const tugasTersedia = await prisma.tugas.findMany({
        where: {
          mataKuliahId,
          tahunAjaranId,
          kelasId: { in: kelasTersedia.map((item) => item.id) },
        },
        select: { id: true, nama: true, kelasId: true, kelas: { select: { nama: true } } },
        orderBy: [{ kelasId: "asc" }, { pertemuanKe: "asc" }, { nama: "asc" }],
      });
      const tugasPerSheet = new Map<string, typeof tugasTersedia>();
      tugasTersedia.forEach((tugas, index) => {
        const kunci = normalisasiNamaSheetNilai(namaSheetNilai(index, tugas.kelas.nama, tugas.nama));
        const daftar = tugasPerSheet.get(kunci) ?? [];
        daftar.push(tugas);
        tugasPerSheet.set(kunci, daftar);
      });
      for (const pemetaan of pemetaanLembar) {
        if (pemetaan.tugasId && pemetaan.kelasId) continue;
        const tugasCocok = tugasPerSheet.get(normalisasiNamaSheetNilai(pemetaan.sheet)) ?? [];
        if (tugasCocok.length !== 1) {
          return {
            ok: false,
            error: `${file.name}: metadata untuk sheet "${pemetaan.sheet}" kosong dan ${tugasCocok.length === 0 ? "sheet tidak cocok dengan tugas pada kelas yang dapat Anda kelola" : "sheet cocok dengan lebih dari satu tugas"}.`,
          };
        }
        const tugas = tugasCocok[0];
        if (
          (pemetaan.tugasId && pemetaan.tugasId !== tugas.id) ||
          (pemetaan.kelasId && pemetaan.kelasId !== tugas.kelasId)
        ) {
          return {
            ok: false,
            error: `${file.name}: metadata sheet "${pemetaan.sheet}" tidak cocok dengan tugas dan kelas.`,
          };
        }
        pemetaan.tugasId = tugas.id;
        pemetaan.kelasId = tugas.kelasId;
      }
    }
    if (!pemetaanLembar.length) {
      return { ok: false, error: `${file.name}: tidak ada sheet tugas pada template.` };
    }

    const namaSheetTerpetakan = new Set<string>();
    const tugasTerpetakan = new Set<string>();
    for (const pemetaan of pemetaanLembar) {
      if (
        !pemetaan.sheet ||
        !pemetaan.tugasId ||
        !pemetaan.kelasId ||
        namaSheetTerpetakan.has(pemetaan.sheet) ||
        tugasTerpetakan.has(pemetaan.tugasId)
      ) {
        return { ok: false, error: `${file.name}: ada pemetaan sheet tugas yang kosong atau duplikat.` };
      }
      namaSheetTerpetakan.add(pemetaan.sheet);
      tugasTerpetakan.add(pemetaan.tugasId);

      let aksesKelas;
      try {
        aksesKelas = await pastikanPengelolaMK(mataKuliahId, pemetaan.kelasId);
      } catch {
        return { ok: false, error: `${file.name}: Anda tidak berhak mengelola kelas pada salah satu sheet.` };
      }
      if (aksesKelas.ta.id !== tahunAjaranId || aksesKelas.ta.status !== "AKTIF") {
        return { ok: false, error: `${file.name}: tahun ajaran atau akses kelas pada salah satu sheet tidak valid.` };
      }
      const tugas = await prisma.tugas.findFirst({
        where: {
          id: pemetaan.tugasId,
          mataKuliahId,
          tahunAjaranId,
          kelasId: pemetaan.kelasId,
        },
        select: { id: true, nama: true, kelasId: true, kelas: { select: { nama: true } } },
      });
      if (!tugas) {
        return { ok: false, error: `${file.name}: tugas pada sheet "${pemetaan.sheet}" tidak cocok dengan mata kuliah dan kelas.` };
      }
      const worksheet = workbook.getWorksheet(pemetaan.sheet);
      if (!worksheet) {
        return { ok: false, error: `${file.name}: sheet "${pemetaan.sheet}" tidak ditemukan.` };
      }
      const kolomHeader: string[] = [];
      worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => {
        kolomHeader[index - 1] = teksSel(cell.value);
      });
      const kolom = petakanKolomNilai(kolomHeader, !metadataLama);
      if (!kolom) {
        const kolomWajib = metadataLama ? "NIM dan Nilai" : "Kelas, NIM, dan Nilai";
        return { ok: false, error: `${file.name}, sheet "${pemetaan.sheet}": header wajib ${kolomWajib}.` };
      }

      worksheet.eachRow((row, nomor) => {
        if (nomor === 1) return;
        const nim = teksSel(row.getCell(kolom.get("nim")!).value).trim();
        const nilaiTeks = teksSel(row.getCell(kolom.get("nilai")!).value).trim();
        const kelasTeks = metadataLama
          ? tugas.kelas.nama
          : teksSel(row.getCell(kolom.get("kelas")!).value).trim();
        if (!nilaiTeks) return;
        lembarImpor.push({
          file: file.name,
          mataKuliahId,
          tahunAjaranId,
          tugasId: tugas.id,
          kelasId: tugas.kelasId,
          mataKuliah: `${mataKuliah.kode} - ${mataKuliah.nama}`,
          kelas: tugas.kelas.nama,
          tugas: tugas.nama,
          baris: nomor,
          nim,
          nilaiTeks,
          kelasTeks,
        });
      });
      if (lembarImpor.length > BATAS_IMPOR_NILAI.jumlahBaris) {
        return { ok: false, error: `Jumlah baris nilai melebihi batas ${BATAS_IMPOR_NILAI.jumlahBaris} untuk sekali impor.` };
      }
    }

    if (!metadataLama) {
      const namaSheetDiWorkbook = new Set(
        workbook.worksheets
          .filter((sheet) => sheet.name !== "Petunjuk" && sheet.name !== "_metadata")
          .map((sheet) => sheet.name),
      );
      if (
        namaSheetDiWorkbook.size !== namaSheetTerpetakan.size ||
        [...namaSheetDiWorkbook].some((nama) => !namaSheetTerpetakan.has(nama))
      ) {
        return { ok: false, error: `${file.name}: daftar sheet telah berubah. Gunakan sheet tugas dari template tanpa mengganti namanya.` };
      }
    }
  }

  if (!lembarImpor.length) {
    return { ok: false, error: "Tidak ada nilai yang diisi pada file yang dipilih." };
  }

  const pendaftaranPerKelas = new Map<string, { id: string; nim: string; nama: string }>();
  const kelasUntukDicari = new Map<string, { mataKuliahId: string; tahunAjaranId: string; kelasId: string }>();
  for (const item of lembarImpor) {
    kelasUntukDicari.set(
      `${item.mataKuliahId}:${item.tahunAjaranId}:${item.kelasId}`,
      { mataKuliahId: item.mataKuliahId, tahunAjaranId: item.tahunAjaranId, kelasId: item.kelasId },
    );
  }
  for (const pasangan of kelasUntukDicari.values()) {
    const pendaftaran = await prisma.pendaftaranMK.findMany({
      where: {
        mataKuliahId: pasangan.mataKuliahId,
        tahunAjaranId: pasangan.tahunAjaranId,
        kelasId: pasangan.kelasId,
      },
      select: { mahasiswaId: true, mahasiswa: { select: { nim: true, nama: true } } },
    });
    for (const item of pendaftaran) {
      pendaftaranPerKelas.set(
        `${pasangan.mataKuliahId}:${pasangan.tahunAjaranId}:${pasangan.kelasId}:${item.mahasiswa.nim}`,
        { id: item.mahasiswaId, nim: item.mahasiswa.nim, nama: item.mahasiswa.nama },
      );
    }
  }

  const nilaiTersimpan = await prisma.nilai.findMany({
    where: {
      tahunAjaranId: { in: [...new Set(lembarImpor.map((item) => item.tahunAjaranId))] },
      tugasId: { in: [...new Set(lembarImpor.map((item) => item.tugasId))] },
    },
    select: { tugasId: true, mahasiswaId: true, skor: true },
  });
  const nilaiSebelumnya = new Map(
    nilaiTersimpan.map((item) => [`${item.tugasId}:${item.mahasiswaId}`, item.skor]),
  );
  const frekuensi = new Map<string, number>();
  for (const item of lembarImpor) {
    const kunci = `${item.tugasId}:${item.nim}`;
    if (item.nim && item.nilaiTeks) frekuensi.set(kunci, (frekuensi.get(kunci) ?? 0) + 1);
  }

  const baris = lembarImpor.map((item): BarisImporNilai => {
    const kunciSiswa = `${item.mataKuliahId}:${item.tahunAjaranId}:${item.kelasId}:${item.nim}`;
    const siswa = pendaftaranPerKelas.get(kunciSiswa);
    const kelasCocok = normalisasiHeaderNilai(item.kelasTeks) === normalisasiHeaderNilai(item.kelas);
    const hasilNilai = bacaNilaiImpor(item.nilaiTeks);
    let pesan: string | null = null;
    if (!item.nim) pesan = "NIM wajib diisi jika Nilai diisi.";
    else if (!kelasCocok) pesan = `Kelas pada baris harus "${item.kelas}".`;
    else if (!siswa) pesan = "Mahasiswa tidak terdaftar pada kelas tugas ini.";
    else if (frekuensi.get(`${item.tugasId}:${item.nim}`)! > 1) {
      pesan = "NIM dan tugas ini muncul lebih dari sekali pada file yang dipilih.";
    } else if (hasilNilai.pesan) pesan = hasilNilai.pesan;

    return {
      file: item.file,
      mataKuliah: item.mataKuliah,
      mataKuliahId: item.mataKuliahId,
      kelas: item.kelas,
      kelasId: item.kelasId,
      tugas: item.tugas,
      tugasId: item.tugasId,
      baris: item.baris,
      nim: item.nim,
      nama: siswa?.nama ?? null,
      nilai: pesan ? null : hasilNilai.nilai,
      nilaiSebelumnya: siswa ? nilaiSebelumnya.get(`${item.tugasId}:${siswa.id}`) ?? null : null,
      mahasiswaId: pesan ? null : siswa?.id ?? null,
      pesan,
    };
  });
  return { ok: true, baris };
}

export async function simpanImporNilaiBanyak(formData: FormData) {
  const user = (await auth())?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "DOSEN")) {
    throw new Error("Sesi tidak valid atau Anda tidak berhak menyimpan nilai.");
  }
  const teksEntri = formData.get("entri");
  if (typeof teksEntri !== "string") throw new Error("Data nilai untuk disimpan tidak valid.");

  let nilaiMasuk: unknown;
  try {
    nilaiMasuk = JSON.parse(teksEntri);
  } catch {
    throw new Error("Data nilai untuk disimpan tidak valid.");
  }
  if (!Array.isArray(nilaiMasuk) || nilaiMasuk.length === 0 || nilaiMasuk.length > BATAS_IMPOR_NILAI.jumlahBaris) {
    throw new Error("Jumlah nilai untuk disimpan tidak valid.");
  }

  const entri = nilaiMasuk.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("mataKuliahId" in item) ||
      !("kelasId" in item) ||
      !("tugasId" in item) ||
      !("mahasiswaId" in item) ||
      !("nilai" in item) ||
      typeof item.mataKuliahId !== "string" ||
      typeof item.kelasId !== "string" ||
      typeof item.tugasId !== "string" ||
      typeof item.mahasiswaId !== "string" ||
      typeof item.nilai !== "number" ||
      !Number.isFinite(item.nilai) ||
      item.nilai < 0 ||
      item.nilai > 100 ||
      Math.abs(item.nilai * 10 - Math.round(item.nilai * 10)) > 1e-8
    ) {
      throw new Error("Ada data nilai yang tidak valid.");
    }
    return {
      mataKuliahId: item.mataKuliahId,
      kelasId: item.kelasId,
      tugasId: item.tugasId,
      mahasiswaId: item.mahasiswaId,
      nilai: item.nilai,
    };
  });
  const kunciUnik = new Set(entri.map((item) => `${item.tugasId}:${item.mahasiswaId}`));
  if (kunciUnik.size !== entri.length) throw new Error("Ada nilai ganda untuk mahasiswa dan tugas yang sama.");

  const grupTugas = new Map<string, typeof entri>();
  for (const item of entri) {
    const kunci = `${item.mataKuliahId}:${item.kelasId}:${item.tugasId}`;
    const daftar = grupTugas.get(kunci) ?? [];
    daftar.push(item);
    grupTugas.set(kunci, daftar);
  }
  const tahunPerMK = new Map<string, string>();
  for (const daftar of grupTugas.values()) {
    const contoh = daftar[0];
    const akses = await pastikanPengelolaMK(contoh.mataKuliahId, contoh.kelasId);
    if (akses.ta.status !== "AKTIF") throw new Error("Tahun ajaran arsip hanya dapat dilihat.");
    const tahunSebelumnya = tahunPerMK.get(contoh.mataKuliahId);
    if (tahunSebelumnya && tahunSebelumnya !== akses.ta.id) {
      throw new Error("Seluruh nilai harus berasal dari tahun ajaran aktif yang sama.");
    }
    tahunPerMK.set(contoh.mataKuliahId, akses.ta.id);
    const [tugas, pendaftaran] = await Promise.all([
      prisma.tugas.findFirst({
        where: {
          id: contoh.tugasId,
          mataKuliahId: contoh.mataKuliahId,
          kelasId: akses.kelasId,
          tahunAjaranId: akses.ta.id,
        },
        select: { id: true },
      }),
      prisma.pendaftaranMK.findMany({
        where: {
          mataKuliahId: contoh.mataKuliahId,
          kelasId: akses.kelasId,
          tahunAjaranId: akses.ta.id,
          mahasiswaId: { in: daftar.map((item) => item.mahasiswaId) },
        },
        select: { mahasiswaId: true },
      }),
    ]);
    const mahasiswaTerdaftar = new Set(pendaftaran.map((item) => item.mahasiswaId));
    if (
      !tugas ||
      daftar.some(
        (item) =>
          item.mataKuliahId !== contoh.mataKuliahId ||
          item.kelasId !== contoh.kelasId ||
          item.tugasId !== contoh.tugasId ||
          !mahasiswaTerdaftar.has(item.mahasiswaId),
      )
    ) {
      throw new Error("Ada nilai untuk tugas, kelas, atau mahasiswa yang tidak terdaftar/diizinkan.");
    }
  }

  await prisma.$transaction(
    [
      ...entri.map((item) =>
        prisma.nilai.upsert({
          where: { mahasiswaId_tugasId: { mahasiswaId: item.mahasiswaId, tugasId: item.tugasId } },
          create: {
            mahasiswaId: item.mahasiswaId,
            tugasId: item.tugasId,
            tahunAjaranId: tahunPerMK.get(item.mataKuliahId)!,
            skor: item.nilai,
          },
          update: { skor: item.nilai },
        }),
      ),
    ],
  );

  const mataKuliahIds = [...new Set(entri.map((item) => item.mataKuliahId))];
  for (const mataKuliahId of mataKuliahIds) {
    await hitungUlangMataKuliah(mataKuliahId, tahunPerMK.get(mataKuliahId)!);
    revalidatePath(`/dosen/input-nilai/${mataKuliahId}`);
    revalidatePath(`/dosen/hasil/${mataKuliahId}`);
  }
  return { tersimpan: entri.length, jumlahMataKuliah: mataKuliahIds.length };
}

export async function simpanNilaiMassal(
  mataKuliahId: string,
  kelasId: string,
  tugasId: string,
  formData: FormData,
) {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId);
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
    kelasId: akses.kelasId,
  };
  const [tugasValid, terdaftar] = await Promise.all([
    prisma.tugas.findMany({
      where: whereTugas,
      select: {
        id: true,
        kelasId: true,
      },
    }),
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, kelasId: akses.kelasId },
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
        kelasPerMahasiswa.get(mahasiswaId) !== tugasValidId.kelasId,
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

export async function kosongkanNilaiTugas(
  mataKuliahId: string,
  kelasId: string,
  tugasId: string,
) {
  const akses = await pastikanPengelolaMK(mataKuliahId, kelasId);
  const tugas = await prisma.tugas.findFirst({
    where: {
      id: tugasId,
      mataKuliahId,
      tahunAjaranId: akses.ta.id,
      kelasId: akses.kelasId,
    },
    select: { id: true },
  });
  if (!tugas) throw new Error("Tugas tidak tersedia untuk mata kuliah atau kelas ini.");

  const hasil = await prisma.nilai.deleteMany({
    where: { tugasId: tugas.id, tahunAjaranId: akses.ta.id },
  });

  if (hasil.count > 0) {
    await hitungUlangMataKuliah(mataKuliahId, akses.ta.id);
    revalidatePath(`/dosen/input-nilai/${mataKuliahId}`);
    revalidatePath(`/dosen/hasil/${mataKuliahId}`);
  }

  return { dihapus: hasil.count };
}