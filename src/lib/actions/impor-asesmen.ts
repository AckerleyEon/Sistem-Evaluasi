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
  BATAS_IMPOR_ASESMEN,
  cariMataKuliahDariNamaFile,
  normalisasiNamespaceWorkbookExcel,
  normalisasiKunciAsesmen,
  petakanKolomAsesmen,
  saringBarisAsesmenBaru,
  type KolomAsesmen,
} from "@/lib/asesmen-impor-util";

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
  if (files.length > BATAS_IMPOR_ASESMEN.jumlahFile) {
    return { ok: false, pesan: `Maksimal ${BATAS_IMPOR_ASESMEN.jumlahFile} file untuk satu kali impor.` };
  }
  const fileList = files.filter((file): file is File => file instanceof File);
  if (fileList.some((file) => !file.name.toLowerCase().endsWith(".xlsx"))) {
    return { ok: false, pesan: "Semua file harus berformat .xlsx." };
  }
  if (fileList.some((file) => file.size > BATAS_IMPOR_ASESMEN.ukuranPerFile)) {
    return { ok: false, pesan: "Ukuran setiap file maksimal 5 MB." };
  }
  if (fileList.reduce((total, file) => total + file.size, 0) > BATAS_IMPOR_ASESMEN.ukuranTotal) {
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
    const isiFile = await file.arrayBuffer();
    const signatureZip = new Uint8Array(isiFile, 0, Math.min(4, isiFile.byteLength));
    if (
      signatureZip[0] !== 0x50 ||
      signatureZip[1] !== 0x4b ||
      ![0x03, 0x05, 0x07].includes(signatureZip[2]) ||
      ![0x04, 0x06, 0x08].includes(signatureZip[3])
    ) {
      return {
        ok: false,
        pesan: `${file.name}: isi file bukan workbook .xlsx biasa (berkas terenkripsi atau format Excel lain). Buka file di Excel lalu simpan ulang sebagai "Excel Workbook (*.xlsx)".`,
      };
    }

    try {
      const bufferNormal = await normalisasiNamespaceWorkbookExcel(Buffer.from(isiFile));
      await workbook.xlsx.load(bufferNormal as unknown as ExcelJS.Buffer);
    } catch (error) {
      console.error(`Gagal membaca workbook asesmen "${file.name}".`, error);
      const detail = error instanceof Error ? error.message : "kesalahan parser tidak diketahui";
      return {
        ok: false,
        pesan: `${file.name}: workbook tidak dapat diproses oleh pembaca Excel (${detail}). Buka lalu simpan ulang sebagai "Excel Workbook (*.xlsx)".`,
      };
    }

    const metadata = workbook.getWorksheet("_metadata");
    const metadataMkId = teksSel(metadata?.getCell("A2").value);
    const metadataTaId = teksSel(metadata?.getCell("B2").value);
    if (metadataMkId && metadataMkId !== mk.id) {
      return { ok: false, pesan: `${file.name}: isi template tidak sesuai dengan mata kuliah pada nama file.` };
    }

    const worksheet = workbook.getWorksheet("Asesmen") ?? workbook.worksheets[0];
    if (!worksheet) return { ok: false, pesan: `${file.name}: lembar Asesmen atau lembar pertama tidak ditemukan.` };

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

  let jumlahDilewati = 0;
  for (const item of grup.values()) {
    item.tugasLama = await prisma.tugas.findMany({
      where: { mataKuliahId: item.mataKuliahId, tahunAjaranId: item.tahunAjaranId, kelasId: item.kelasId },
      select: { id: true, bobot: true, nama: true },
    });
    const hasilSaring = saringBarisAsesmenBaru(
      item.baris,
      item.tugasLama.map((tugas) => tugas.nama),
    );
    item.baris = hasilSaring.barisBaru;
    jumlahDilewati += hasilSaring.jumlahDilewati;

    const namaTerpakai = new Set<string>();
    for (const row of item.baris) {
      const kunciNama = normalisasiKunciAsesmen(row.nama);
      if (namaTerpakai.has(kunciNama)) return { ok: false, pesan: `${row.file}: nama tugas "${row.nama}" duplikat pada kelas yang sama.` };
      namaTerpakai.add(kunciNama);
    }
    if (item.baris.length === 0) continue;

    const bobotImpor = item.baris.reduce((jumlah, row) => jumlah + row.bobot, 0);
    if (item.tugasLama.length === 0 && bobotImpor !== 100) {
      return { ok: false, pesan: `Total bobot tugas baru pada kelas harus 100% (saat ini ${bobotImpor}%).` };
    }
    if (item.tugasLama.length > 0 && bobotImpor >= 100) {
      return { ok: false, pesan: "Total bobot tugas baru pada kelas harus kurang dari 100%." };
    }
  }

  const jumlahDiimpor = [...grup.values()].reduce((jumlah, item) => jumlah + item.baris.length, 0);
  if (jumlahDiimpor > 0) {
    await prisma.$transaction(async (tx) => {
      for (const item of grup.values()) {
        if (item.baris.length === 0) continue;
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
  }

  const mataKuliahBerubah = new Set(
    [...grup.values()].filter((item) => item.baris.length > 0).map((item) => item.mataKuliahId),
  );
  for (const mataKuliahId of mataKuliahBerubah) {
    await hitungUlangMataKuliah(mataKuliahId, targetTahun.get(mataKuliahId)!);
    revalidatePath(`/dosen/komponen-penilaian/${mataKuliahId}`);
  }
  return {
    ok: true,
    pesan: `${jumlahDiimpor} tugas baru berhasil diimpor dari ${fileList.length} file. ${jumlahDilewati} tugas yang sudah ada dilewati.`,
    jumlah: jumlahDiimpor,
  };
}
