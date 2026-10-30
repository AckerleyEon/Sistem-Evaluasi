"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { bagiProporsional, bobotKePersen } from "@/lib/asesmen-util";
import { pastikanPengelolaMK } from "@/lib/otorisasi";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";
import { auth } from "@/auth";
import { getTahunAjaranAktif, getTahunAjaranDosen } from "@/lib/tahun-ajaran";
import {
  cariMataKuliahDariNamaFile,
  normalisasiKunciAsesmen,
  petakanKolomAsesmen,
  type KolomAsesmen,
} from "@/lib/asesmen-impor-util";

const MAKS_UKURAN_FILE = 5 * 1024 * 1024;
const MAKS_UKURAN_TOTAL = 20 * 1024 * 1024;
const MAKS_FILE = 20;

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
  file: string;
  baris: number;
  mataKuliahId: string;
  tahunAjaranId: string;
  kelasId: string;
  nama: string;
  pertemuan: number;
  bobot: number;
  kodeSub: string[];
  subIds: string[];
};

type GrupImpor = {
  mataKuliahId: string;
  tahunAjaranId: string;
  kelasId: string;
  baris: BarisAsesmen[];
  tugasLama: { id: string; bobot: number; nama: string }[];
};

export async function imporAsesmenExcel(
  formData: FormData,
): Promise<{ ok: boolean; pesan: string; jumlah?: number }> {
  const user = (await auth())?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "DOSEN")) {
    return { ok: false, pesan: "Sesi tidak valid atau Anda tidak berhak mengimpor asesmen." };
  }
  const tahunAjaran = user.role === "DOSEN" && user.dosenId
    ? await getTahunAjaranDosen(user.dosenId)
    : await getTahunAjaranAktif();
  if (!tahunAjaran || tahunAjaran.status !== "AKTIF") {
    return { ok: false, pesan: "Tidak ada Tahun Ajaran aktif untuk mengimpor asesmen." };
  }
  if (!(formData instanceof FormData)) return { ok: false, pesan: "Data impor tidak valid." };

  const files = formData.getAll("files");
  if (files.length === 0 || files.some((file) => !(file instanceof File) || file.size === 0)) {
    return { ok: false, pesan: "Pilih minimal satu file Excel (.xlsx) yang sudah diisi." };
  }
  if (files.length > MAKS_FILE) return { ok: false, pesan: `Maksimal ${MAKS_FILE} file untuk satu kali impor.` };
  const fileList = files.filter((file): file is File => file instanceof File);
  if (fileList.some((file) => !file.name.toLowerCase().endsWith(".xlsx"))) {
    return { ok: false, pesan: "Semua file harus berformat .xlsx." };
  }
  if (fileList.some((file) => file.size > MAKS_UKURAN_FILE)) {
    return { ok: false, pesan: "Ukuran setiap file maksimal 5 MB." };
  }
  if (fileList.reduce((total, file) => total + file.size, 0) > MAKS_UKURAN_TOTAL) {
    return { ok: false, pesan: "Ukuran total file maksimal 20 MB." };
  }

  const mataKuliah = await prisma.mataKuliah.findMany({
    select: { id: true, kode: true, nama: true },
  });
  const kelasCache = new Map<string, { id: string; nama: string }[]>();
  const subCache = new Map<string, { id: string; kode: string }[]>();
  const grup = new Map<string, GrupImpor>();
  const targetTahun = new Map<string, string>();
  const semuaBaris: BarisAsesmen[] = [];

  for (const file of fileList) {
    if (!/^.+_asesmen\.xlsx$/i.test(file.name)) {
      return {
        ok: false,
        pesan: `${file.name}: nama file harus mengikuti format KODEMK_NAMAMK_asesmen.xlsx.`,
      };
    }
    const mk = cariMataKuliahDariNamaFile(file.name, mataKuliah);
    if (!mk) {
      return { ok: false, pesan: `${file.name}: kode dan nama mata kuliah pada nama file tidak cocok dengan data.` };
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
    } catch {
      return { ok: false, pesan: `${file.name}: file tidak bisa dibaca. Pastikan file .xlsx valid.` };
    }

    const metadata = workbook.getWorksheet("_metadata");
    const metadataMkId = teksSel(metadata?.getCell("A2").value);
    const metadataTaId = teksSel(metadata?.getCell("B2").value);
    if (metadataMkId && metadataMkId !== mk.id) {
      return { ok: false, pesan: `${file.name}: isi template tidak sesuai dengan mata kuliah pada nama file.` };
    }

    const worksheet = workbook.getWorksheet("Asesmen");
    if (!worksheet) return { ok: false, pesan: `${file.name}: lembar Asesmen tidak ditemukan.` };

    const header: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => {
      header[index - 1] = teksSel(cell.value);
    });
    const kolom = petakanKolomAsesmen(header);
    if (!kolom) {
      return { ok: false, pesan: `${file.name}: kolom wajib adalah Kelas, Nama Tugas, Pertemuan, Bobot, dan Kode Sub-CPMK.` };
    }

    if (metadataTaId && metadataTaId !== tahunAjaran.id) {
      return { ok: false, pesan: `${file.name}: template berasal dari tahun ajaran yang berbeda.` };
    }

    const kelasList =
      kelasCache.get(mk.id) ??
      (await prisma.kelasMK.findMany({
        where: { mataKuliahId: mk.id, tahunAjaranId: tahunAjaran.id },
        select: { id: true, nama: true },
      }));
    kelasCache.set(mk.id, kelasList);

    const fileBaris: BarisAsesmen[] = [];
    let galatBaris: string | null = null;
    worksheet.eachRow((row, nomor) => {
      if (nomor === 1 || galatBaris) return;
      const teks = (namaKolom: KolomAsesmen) => teksSel(row.getCell(kolom.get(namaKolom)!).value).trim();
      const kelasNama = teks("kelas");
      const nama = teks("nama");
      const pertemuanTeks = teks("pertemuan");
      const bobotTeks = teks("bobot");
      const kodeTeks = teks("sub");
      if (!kelasNama && !nama && !pertemuanTeks && !bobotTeks && !kodeTeks) return;

      const kelas = kelasList.find(
        (item) => normalisasiKunciAsesmen(item.nama) === normalisasiKunciAsesmen(kelasNama.replace(/^kelas\s+/i, "")),
      );
      if (!kelas) {
        galatBaris = `${file.name}: kelas "${kelasNama || "(kosong)"}" pada baris ${nomor} tidak ditemukan untuk mata kuliah ini.`;
        return;
      }

      const pertemuan = Number(pertemuanTeks);
      const bobot = Number(bobotTeks.replace(",", "."));
      fileBaris.push({
        file: file.name,
        baris: nomor,
        mataKuliahId: mk.id,
        tahunAjaranId: metadataTaId,
        kelasId: kelas.id,
        nama,
        pertemuan,
        bobot,
        kodeSub: kodeTeks.split(/[,;\n]/).map((kode) => kode.trim()).filter(Boolean),
        subIds: [],
      });
    });
    if (galatBaris) return { ok: false, pesan: galatBaris };
    if (fileBaris.length === 0) return { ok: false, pesan: `${file.name}: belum ada baris asesmen yang diisi.` };
    if (fileBaris.length > 100) return { ok: false, pesan: `${file.name}: maksimal 100 tugas per file.` };

    const accessByClass = new Map<string, { ta: { id: string } }>();
    for (const row of fileBaris) {
      if (!accessByClass.has(row.kelasId)) {
        try {
          const akses = await pastikanPengelolaMK(mk.id, row.kelasId);
          accessByClass.set(row.kelasId, akses);
          const tahunSebelumnya = targetTahun.get(mk.id);
          if (tahunSebelumnya && tahunSebelumnya !== akses.ta.id) {
            return { ok: false, pesan: `${file.name}: seluruh file harus memakai tahun ajaran aktif yang sama.` };
          }
          if (akses.ta.id !== tahunAjaran.id) return { ok: false, pesan: `${file.name}: tahun ajaran aktif berubah saat impor.` };
          targetTahun.set(mk.id, akses.ta.id);
        } catch (error) {
          return {
            ok: false,
            pesan: error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: akses kelas ditolak.`,
          };
        }
      }
      row.tahunAjaranId = accessByClass.get(row.kelasId)!.ta.id;
    }

    const subs =
      subCache.get(mk.id) ??
      (await prisma.subCPMK.findMany({
        where: { mataKuliahId: mk.id, tahunAjaranId: targetTahun.get(mk.id), cpmkTerkait: { some: {} } },
        select: { id: true, kode: true },
      }));
    subCache.set(mk.id, subs);
    const subByKode = new Map(subs.map((sub) => [normalisasiKunciAsesmen(sub.kode), sub]));

    for (const row of fileBaris) {
      if (!row.nama) return { ok: false, pesan: `${file.name}: nama tugas wajib pada baris ${row.baris}.` };
      if (row.nama.length > 120) return { ok: false, pesan: `${file.name}: nama tugas pada baris ${row.baris} maksimal 120 karakter.` };
      if (!Number.isInteger(row.pertemuan) || row.pertemuan < 1 || row.pertemuan > 16) {
        return { ok: false, pesan: `${file.name}: pertemuan pada baris ${row.baris} harus angka 1-16.` };
      }
      if (!Number.isInteger(row.bobot) || row.bobot < 1 || row.bobot > 99) {
        return { ok: false, pesan: `${file.name}: bobot pada baris ${row.baris} harus angka bulat 1-99.` };
      }
      if (row.kodeSub.length === 0) return { ok: false, pesan: `${file.name}: isi kode Sub-CPMK pada baris ${row.baris}.` };
      if (new Set(row.kodeSub.map(normalisasiKunciAsesmen)).size !== row.kodeSub.length) {
        return { ok: false, pesan: `${file.name}: ada kode Sub-CPMK berulang pada baris ${row.baris}.` };
      }
      for (const kode of row.kodeSub) {
        const sub = subByKode.get(normalisasiKunciAsesmen(kode));
        if (!sub) return { ok: false, pesan: `${file.name}: kode Sub-CPMK "${kode}" pada baris ${row.baris} bukan milik mata kuliah ini.` };
        row.subIds.push(sub.id);
      }

      const kunciGrup = `${mk.id}:${row.kelasId}`;
      const grupSaatIni = grup.get(kunciGrup) ?? {
        mataKuliahId: mk.id,
        tahunAjaranId: row.tahunAjaranId,
        kelasId: row.kelasId,
        baris: [],
        tugasLama: [],
      };
      grupSaatIni.baris.push(row);
      grup.set(kunciGrup, grupSaatIni);
    }
    semuaBaris.push(...fileBaris);
  }

  if (semuaBaris.length > 500) return { ok: false, pesan: "Maksimal 500 tugas dalam satu kali impor." };

  for (const item of grup.values()) {
    const namaTerpakai = new Set<string>();
    for (const row of item.baris) {
      const kunciNama = normalisasiKunciAsesmen(row.nama);
      if (namaTerpakai.has(kunciNama)) return { ok: false, pesan: `${row.file}: nama tugas "${row.nama}" duplikat pada kelas yang sama.` };
      namaTerpakai.add(kunciNama);
    }
    item.tugasLama = await prisma.tugas.findMany({
      where: { mataKuliahId: item.mataKuliahId, tahunAjaranId: item.tahunAjaranId, kelasId: item.kelasId },
      select: { id: true, bobot: true, nama: true },
    });
    if (item.tugasLama.some((tugas) => namaTerpakai.has(normalisasiKunciAsesmen(tugas.nama)))) {
      return { ok: false, pesan: "Nama tugas sudah digunakan pada mata kuliah/kelas ini. Gunakan nama yang berbeda." };
    }
    const bobotImpor = item.baris.reduce((jumlah, row) => jumlah + row.bobot, 0);
    if (item.tugasLama.length === 0 && bobotImpor !== 100) {
      return { ok: false, pesan: `Total bobot tugas baru pada kelas harus 100% (saat ini ${bobotImpor}%).` };
    }
    if (item.tugasLama.length > 0 && bobotImpor >= 100) {
      return { ok: false, pesan: "Total bobot tugas baru pada kelas harus kurang dari 100%." };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of grup.values()) {
      const bobotImpor = item.baris.reduce((jumlah, row) => jumlah + row.bobot, 0);
      const bobotLamaBaru = item.tugasLama.length > 0
        ? bagiProporsional(item.tugasLama.map((tugas) => bobotKePersen(tugas.bobot)), 100 - bobotImpor)
        : [];
      for (const [indeks, tugas] of item.tugasLama.entries()) {
        await tx.tugas.update({
          where: { id: tugas.id },
          data: { bobot: bobotLamaBaru[indeks] / 100 },
        });
      }
      for (const row of item.baris) {
        const tugas = await tx.tugas.create({
          data: {
            nama: row.nama,
            pertemuanKe: row.pertemuan,
            bobot: row.bobot / 100,
            mataKuliahId: item.mataKuliahId,
            tahunAjaranId: item.tahunAjaranId,
            kelasId: item.kelasId,
          },
          select: { id: true },
        });
        await tx.distribusiSubCPMK.createMany({
          data: row.subIds.map((subCpmkId) => ({ subCpmkId, tugasId: tugas.id, sumber: "MANUAL" as const })),
        });
      }
    }
  });

  for (const [mataKuliahId, tahunAjaranId] of targetTahun) {
    await hitungUlangMataKuliah(mataKuliahId, tahunAjaranId);
    revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  }
  return {
    ok: true,
    pesan: `${semuaBaris.length} tugas dari ${fileList.length} file berhasil diimpor ke ${targetTahun.size} mata kuliah.`,
    jumlah: semuaBaris.length,
  };
}
