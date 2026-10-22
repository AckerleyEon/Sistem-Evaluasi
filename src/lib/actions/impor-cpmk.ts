"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";
import {
  normalisasiKodeMK,
  saringBarisBergalat,
  validasiBarisCPMK,
  type BarisCPMKExcel,
  type DataImporCPMK,
} from "@/lib/impor-cpmk";

const MAKS_BARIS = 5000;
const MAKS_UKURAN = 5 * 1024 * 1024;
const HEADER = [
  "kodemk",
  "namamatakuliah",
  "kodecpmk",
  "bobotcpmk",
  "deskripsicpmk",
  "kodesubcpmk",
  "bobotsubcpmk",
  "deskripsisubcpmk",
] as const;

type Galat = { baris: number; pesan: string };
type Ringkasan = {
  mataKuliah: number;
  cpmk: number;
  subCpmk: number;
  pemetaan: number;
  cpmkBaru: number;
  cpmkDiperbarui: number;
  subBaru: number;
  subDiperbarui: number;
  pemetaanBaru: number;
  pemetaanDiperbarui: number;
  tidakBerubah: number;
};

type Analisis = {
  tahunAjaran: string;
  jumlahBaris: number;
  jumlahBarisValid: number;
  jumlahGalat: number;
  galat: Galat[];
  ringkasan: Ringkasan;
};

type AnalisisInternal = Analisis & {
  tahunAjaranId: string;
  data: DataImporCPMK;
  dataValid: DataImporCPMK;
  mataKuliahIdPerKode: Map<string, string>;
};

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Hanya admin yang boleh mengimpor CPMK dan Sub-CPMK.");
}

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

function normalisasiHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function bacaFile(formData: FormData): Promise<{ ok: true; baris: BarisCPMKExcel[] } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Format file harus .xlsx." };
  if (file.size > MAKS_UKURAN) return { ok: false, error: "Ukuran file maksimal 5 MB." };

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, error: "File tidak bisa dibaca. Pastikan file .xlsx valid." };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { ok: false, error: "File tidak memiliki lembar kerja." };
  const kolom = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, index) => {
    const nama = normalisasiHeader(teksSel(cell.value));
    const posisi = HEADER.indexOf(nama as (typeof HEADER)[number]);
    if (posisi >= 0) kolom.set(HEADER[posisi], index);
  });
  const hilang = HEADER.filter((header) => !kolom.has(header));
  if (hilang.length) {
    return {
      ok: false,
      error: `Header wajib belum lengkap: ${hilang.join(", ")}. Gunakan template impor CPMK & Sub-CPMK.`,
    };
  }

  const baris: BarisCPMKExcel[] = [];
  const nilaiMerged = Array.from({ length: 5 }, () => "");
  worksheet.eachRow((row, nomor) => {
    if (nomor === 1) return;
    const nilai = HEADER.map((header) => teksSel(row.getCell(kolom.get(header)!).value).replace(/\s+/g, " ").trim());
    if (nilai.every((cell) => !cell)) return;
    for (let i = 0; i < nilaiMerged.length; i++) {
      if (nilai[i]) nilaiMerged[i] = nilai[i];
      else nilai[i] = nilaiMerged[i];
    }
    baris.push({
      baris: nomor,
      kodeMK: nilai[0],
      namaMK: nilai[1],
      kodeCPMK: nilai[2],
      bobotCPMK: nilai[3],
      deskripsiCPMK: nilai[4],
      kodeSubCPMK: nilai[5],
      bobotSubCPMK: nilai[6],
      deskripsiSubCPMK: nilai[7],
    });
  });

  if (baris.length === 0) return { ok: false, error: "Tidak ada data CPMK atau Sub-CPMK pada file." };
  if (baris.length > MAKS_BARIS) return { ok: false, error: `Maksimal ${MAKS_BARIS} baris data per impor.` };
  return { ok: true, baris };
}

async function analisisData(data: DataImporCPMK): Promise<AnalisisInternal | { error: string }> {
  const ta = await prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" }, select: { id: true, label: true } });
  if (!ta) return { error: "Belum ada Tahun Ajaran aktif. Aktifkan tahun ajaran sebelum mengimpor." };

  const galat = [...data.galat];
  const tambahGalatBarisCPMK = (cpmk: (typeof data.mataKuliah)[number]["cpmk"][number], pesan: string) => {
    const barisTerkait = cpmk.sub.map((sub) => sub.baris);
    for (const baris of barisTerkait.length ? barisTerkait : [cpmk.baris]) {
      galat.push({ baris, pesan });
    }
  };
  const tambahGalatMK = (mk: (typeof data.mataKuliah)[number], pesan: string) => {
    const barisTerkait = mk.cpmk.flatMap((cpmk) => cpmk.sub.map((sub) => sub.baris));
    for (const baris of barisTerkait.length ? barisTerkait : [mk.baris]) {
      galat.push({ baris, pesan });
    }
  };
  const mkDatabase = await prisma.mataKuliah.findMany({ select: { id: true, kode: true, nama: true } });
  const mkPerKode = new Map<string, typeof mkDatabase>();
  for (const mk of mkDatabase) {
    const kode = normalisasiKodeMK(mk.kode);
    mkPerKode.set(kode, [...(mkPerKode.get(kode) ?? []), mk]);
  }

  const mataKuliahIdPerKode = new Map<string, string>();
  for (const mk of data.mataKuliah) {
    const cocok = mkPerKode.get(normalisasiKodeMK(mk.kode)) ?? [];
    if (cocok.length === 0) {
      tambahGalatMK(mk, `Mata kuliah ${mk.kode} tidak ditemukan di Data Master Mata Kuliah.`);
    } else if (cocok.length > 1) {
      tambahGalatMK(mk, `Kode ${mk.kode} cocok ke lebih dari satu mata kuliah.`);
    } else {
      const [terpilih] = cocok;
      if (terpilih.nama.trim().toLowerCase() !== mk.nama.trim().toLowerCase()) {
        tambahGalatMK(mk, `Nama mata kuliah tidak sesuai untuk ${mk.kode}; di master tertulis "${terpilih.nama}".`);
      }
      mataKuliahIdPerKode.set(normalisasiKodeMK(mk.kode), terpilih.id);
    }
  }

  const mataKuliahIds = [...new Set(mataKuliahIdPerKode.values())];
  const [cpmkAda, subAda] = mataKuliahIds.length
    ? await Promise.all([
        prisma.cPMK.findMany({
          where: { mataKuliahId: { in: mataKuliahIds }, tahunAjaranId: ta.id },
          select: {
            id: true,
            kode: true,
            deskripsi: true,
            bobot: true,
            mataKuliahId: true,
            sub: { select: { subCpmkId: true, bobot: true } },
          },
        }),
        prisma.subCPMK.findMany({
          where: { mataKuliahId: { in: mataKuliahIds }, tahunAjaranId: ta.id },
          select: { id: true, kode: true, deskripsi: true, mataKuliahId: true },
        }),
      ])
    : [[], []];

  const cpmkAdaPerKunci = new Map(cpmkAda.map((item) => [`${item.mataKuliahId}|${item.kode}`, item]));
  const subAdaPerKunci = new Map(subAda.map((item) => [`${item.mataKuliahId}|${item.kode}`, item]));
  const ringkasan: Ringkasan = {
    mataKuliah: data.mataKuliah.length,
    cpmk: 0,
    subCpmk: 0,
    pemetaan: data.jumlahPemetaan,
    cpmkBaru: 0,
    cpmkDiperbarui: 0,
    subBaru: 0,
    subDiperbarui: 0,
    pemetaanBaru: 0,
    pemetaanDiperbarui: 0,
    tidakBerubah: 0,
  };

  for (const mk of data.mataKuliah) {
    const id = mataKuliahIdPerKode.get(normalisasiKodeMK(mk.kode));
    if (!id) continue;
    const cpmkImpor = new Map(mk.cpmk.map((cpmk) => [cpmk.kode, cpmk.bobot]));
    const totalCPMK = cpmkAda
      .filter((item) => item.mataKuliahId === id && !cpmkImpor.has(item.kode))
      .reduce((total, item) => total + item.bobot, 0) + [...cpmkImpor.values()].reduce((total, bobot) => total + bobot, 0);
    if (totalCPMK > 100) {
      tambahGalatMK(mk, `Total bobot CPMK setelah impor untuk ${mk.kode} menjadi ${totalCPMK}%; maksimal 100%. Data lama yang tidak ada di file tetap dipertahankan.`);
    }

    for (const cpmk of mk.cpmk) {
      const existing = cpmkAdaPerKunci.get(`${id}|${cpmk.kode}`);
      const subImpor = new Map(cpmk.sub.map((sub) => [sub.kode, sub.bobot]));
      const existingSubTotal =
        existing?.sub
          .filter((link) => {
            const kode = subAda.find((sub) => sub.id === link.subCpmkId)?.kode;
            return kode !== undefined && !subImpor.has(kode);
          })
          .reduce((total, link) => total + link.bobot, 0) ?? 0;
      const totalSub = existingSubTotal + [...subImpor.values()].reduce((total, bobot) => total + bobot, 0);
      if (totalSub > 100) {
        tambahGalatBarisCPMK(cpmk, `Total bobot Sub-CPMK setelah impor untuk ${mk.kode} / ${cpmk.kode} menjadi ${totalSub}%; maksimal 100%. Pemetaan lama yang tidak ada di file tetap dipertahankan.`);
      }
    }
  }

  const dataValid = saringBarisBergalat(data, galat);
  ringkasan.mataKuliah = dataValid.mataKuliah.length;
  ringkasan.pemetaan = dataValid.jumlahPemetaan;
  for (const mk of dataValid.mataKuliah) {
    const id = mataKuliahIdPerKode.get(normalisasiKodeMK(mk.kode));
    if (!id) continue;
    const subUnik = new Map<string, (typeof mk.cpmk)[number]["sub"][number]>();
    for (const cpmk of mk.cpmk) {
      ringkasan.cpmk++;
      const cpmkLama = cpmkAdaPerKunci.get(`${id}|${cpmk.kode}`);
      if (!cpmkLama) ringkasan.cpmkBaru++;
      else if (cpmkLama.deskripsi !== cpmk.deskripsi || cpmkLama.bobot !== cpmk.bobot) ringkasan.cpmkDiperbarui++;
      for (const sub of cpmk.sub) {
        subUnik.set(sub.kode, sub);
        const subLama = subAdaPerKunci.get(`${id}|${sub.kode}`);
        const linkLama = cpmkLama?.sub.find((link) => link.subCpmkId === subLama?.id);
        if (!linkLama) ringkasan.pemetaanBaru++;
        else if (linkLama.bobot !== sub.bobot) ringkasan.pemetaanDiperbarui++;
        else ringkasan.tidakBerubah++;
      }
    }
    ringkasan.subCpmk += subUnik.size;
    for (const sub of subUnik.values()) {
      const lama = subAdaPerKunci.get(`${id}|${sub.kode}`);
      if (!lama) ringkasan.subBaru++;
      else if (lama.deskripsi !== sub.deskripsi) ringkasan.subDiperbarui++;
    }
  }
  return {
    tahunAjaran: ta.label,
    tahunAjaranId: ta.id,
    jumlahBaris: data.jumlahBaris,
    jumlahBarisValid: dataValid.jumlahBaris,
    jumlahGalat: new Set(galat.map((item) => item.baris)).size,
    galat,
    ringkasan,
    data,
    dataValid,
    mataKuliahIdPerKode,
  };
}

export async function analisisImporCPMK(
  formData: FormData,
): Promise<{ ok: true; analisis: Analisis } | { ok: false; error: string }> {
  await pastikanAdmin();
  const file = await bacaFile(formData);
  if (!file.ok) return file;
  const data = validasiBarisCPMK(file.baris);
  const hasil = await analisisData(data);
  if ("error" in hasil) return { ok: false, error: hasil.error };
  return {
    ok: true,
    analisis: {
      tahunAjaran: hasil.tahunAjaran,
      jumlahBaris: hasil.jumlahBaris,
      jumlahBarisValid: hasil.jumlahBarisValid,
      jumlahGalat: hasil.jumlahGalat,
      galat: hasil.galat.slice(0, 50),
      ringkasan: hasil.ringkasan,
    },
  };
}

export async function terapkanImporCPMK(
  formData: FormData,
): Promise<{ ok: true; pesan: string } | { ok: false; error: string; galat?: Galat[] }> {
  await pastikanAdmin();
  const file = await bacaFile(formData);
  if (!file.ok) return file;
  const hasil = await analisisData(validasiBarisCPMK(file.baris));
  if ("error" in hasil) return { ok: false, error: hasil.error };
  if (hasil.jumlahBarisValid === 0 || hasil.dataValid.jumlahPemetaan === 0) {
    return { ok: false, error: `Tidak ada baris valid yang dapat diimpor. ${hasil.jumlahGalat} galat dilewati.`, galat: hasil.galat.slice(0, 50) };
  }

  const tahunAjaranId = hasil.tahunAjaranId;
  const dataImpor = hasil.dataValid;
  const mataKuliahId = new Map<string, string>();
  for (const mk of dataImpor.mataKuliah) {
    const id = hasil.mataKuliahIdPerKode.get(normalisasiKodeMK(mk.kode));
    if (id) mataKuliahId.set(normalisasiKodeMK(mk.kode), id);
  }
  const changed = new Set<string>();
  await prisma.$transaction(
    async (tx) => {
      const semuaMK = [...new Set(mataKuliahId.values())];
      const cpmkLama = await tx.cPMK.findMany({
        where: { mataKuliahId: { in: semuaMK }, tahunAjaranId },
        select: { id: true, kode: true, deskripsi: true, bobot: true, mataKuliahId: true },
      });
      const cpmkPerKunci = new Map(cpmkLama.map((item) => [`${item.mataKuliahId}|${item.kode}`, item]));
      const cpmkBuat: { kode: string; deskripsi: string; bobot: number; mataKuliahId: string; tahunAjaranId: string }[] = [];
      for (const mk of dataImpor.mataKuliah) {
        const mkId = mataKuliahId.get(normalisasiKodeMK(mk.kode));
        if (!mkId) continue;
        for (const cpmk of mk.cpmk) {
          const old = cpmkPerKunci.get(`${mkId}|${cpmk.kode}`);
          if (!old) {
            cpmkBuat.push({ kode: cpmk.kode, deskripsi: cpmk.deskripsi, bobot: cpmk.bobot, mataKuliahId: mkId, tahunAjaranId });
            changed.add(mkId);
          } else if (old.deskripsi !== cpmk.deskripsi || old.bobot !== cpmk.bobot) {
            await tx.cPMK.update({ where: { id: old.id }, data: { deskripsi: cpmk.deskripsi, bobot: cpmk.bobot } });
            changed.add(mkId);
          }
        }
      }
      if (cpmkBuat.length) await tx.cPMK.createMany({ data: cpmkBuat, skipDuplicates: true });

      const allCPMK = await tx.cPMK.findMany({
        where: { mataKuliahId: { in: semuaMK }, tahunAjaranId },
        select: { id: true, kode: true, mataKuliahId: true },
      });
      const cpmkIdPerKunci = new Map(allCPMK.map((item) => [`${item.mataKuliahId}|${item.kode}`, item.id]));

      const subLama = await tx.subCPMK.findMany({
        where: { mataKuliahId: { in: semuaMK }, tahunAjaranId },
        select: { id: true, kode: true, deskripsi: true, mataKuliahId: true },
      });
      const subPerKunci = new Map(subLama.map((item) => [`${item.mataKuliahId}|${item.kode}`, item]));
      const subBuat: { kode: string; deskripsi: string; mataKuliahId: string; tahunAjaranId: string }[] = [];
      for (const mk of dataImpor.mataKuliah) {
        const mkId = mataKuliahId.get(normalisasiKodeMK(mk.kode));
        if (!mkId) continue;
        const uniques = new Map(mk.cpmk.flatMap((cpmk) => cpmk.sub).map((sub) => [sub.kode, sub]));
        for (const sub of uniques.values()) {
          const old = subPerKunci.get(`${mkId}|${sub.kode}`);
          if (!old) {
            subBuat.push({ kode: sub.kode, deskripsi: sub.deskripsi, mataKuliahId: mkId, tahunAjaranId });
            changed.add(mkId);
          } else if (old.deskripsi !== sub.deskripsi) {
            await tx.subCPMK.update({ where: { id: old.id }, data: { deskripsi: sub.deskripsi } });
            changed.add(mkId);
          }
        }
      }
      if (subBuat.length) await tx.subCPMK.createMany({ data: subBuat, skipDuplicates: true });

      const allSub = await tx.subCPMK.findMany({
        where: { mataKuliahId: { in: semuaMK }, tahunAjaranId },
        select: { id: true, kode: true, mataKuliahId: true },
      });
      const subIdPerKunci = new Map(allSub.map((item) => [`${item.mataKuliahId}|${item.kode}`, item.id]));
      const linksLama = await tx.cpmkSub.findMany({
        where: { cpmkId: { in: [...cpmkIdPerKunci.values()] } },
        select: { id: true, cpmkId: true, subCpmkId: true, bobot: true },
      });
      const linkPerKunci = new Map(linksLama.map((item) => [`${item.cpmkId}|${item.subCpmkId}`, item]));
      const linkBuat: { cpmkId: string; subCpmkId: string; bobot: number }[] = [];
      for (const mk of dataImpor.mataKuliah) {
        const mkId = mataKuliahId.get(normalisasiKodeMK(mk.kode));
        if (!mkId) continue;
        for (const cpmk of mk.cpmk) {
          const cpmkId = cpmkIdPerKunci.get(`${mkId}|${cpmk.kode}`);
          if (!cpmkId) continue;
          for (const sub of cpmk.sub) {
            const subCpmkId = subIdPerKunci.get(`${mkId}|${sub.kode}`);
            if (!subCpmkId) continue;
            const old = linkPerKunci.get(`${cpmkId}|${subCpmkId}`);
            if (!old) {
              linkBuat.push({ cpmkId, subCpmkId, bobot: sub.bobot });
              changed.add(mkId);
            } else if (old.bobot !== sub.bobot) {
              await tx.cpmkSub.update({ where: { id: old.id }, data: { bobot: sub.bobot } });
              changed.add(mkId);
            }
          }
        }
      }
      if (linkBuat.length) await tx.cpmkSub.createMany({ data: linkBuat, skipDuplicates: true });
    },
    { timeout: 120_000 },
  );

  for (const id of changed) await hitungUlangMataKuliah(id, tahunAjaranId);
  revalidatePath("/admin/data-master/cpmk");
  revalidatePath("/admin");
  revalidatePath("/admin/laporan");
  revalidatePath("/dosen");
  return {
    ok: true,
    pesan: `Impor selesai: ${dataImpor.mataKuliah.reduce((total, mk) => total + mk.cpmk.length, 0)} CPMK, ${new Set(dataImpor.mataKuliah.flatMap((mk) => mk.cpmk.flatMap((cpmk) => cpmk.sub.map((sub) => `${normalisasiKodeMK(mk.kode)}|${sub.kode}`)))).size} Sub-CPMK, dan ${dataImpor.jumlahPemetaan} pemetaan valid diproses. ${hasil.jumlahGalat} baris bergalat dilewati.`,
  };
}
