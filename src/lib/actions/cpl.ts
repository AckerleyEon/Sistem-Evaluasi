"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAKS_BARIS_IMPOR = 500;
const MAKS_UKURAN_IMPOR = 2 * 1024 * 1024;
const POLA_KODE_CPL = /^CPL-\d{2,3}$/;

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola CPL.");
  }
}

function teksSel(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    if ("text" in value) return String(value.text);
    return "";
  }
  return String(value);
}

export type BarisImporCPL = {
  baris: number;
  kode: string;
  deskripsi: string;
  status: "baru" | "duplikat" | "galat";
  pesan: string | null;
};

export async function analisisImporCPL(
  formData: FormData,
): Promise<
  | { ok: true; baris: BarisImporCPL[]; baru: number; duplikat: number; galat: number }
  | { ok: false; error: string }
> {
  await pastikanAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Format file harus .xlsx." };
  if (file.size > MAKS_UKURAN_IMPOR) return { ok: false, error: "Ukuran file maksimal 2 MB." };

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
    const header = teksSel(cell.value).trim().toLowerCase().replace(/\s+/g, " ");
    if (["kode", "kode cpl"].includes(header)) kolom.set("kode", index);
    if (["deskripsi", "deskripsi cpl", "pernyataan cpl"].includes(header)) kolom.set("deskripsi", index);
  });
  if (!kolom.has("kode") || !kolom.has("deskripsi")) {
    return { ok: false, error: "Header Excel harus memiliki kolom Kode CPL dan Deskripsi." };
  }

  const baris: BarisImporCPL[] = [];
  worksheet.eachRow((row, nomor) => {
    if (nomor === 1) return;
    const kode = teksSel(row.getCell(kolom.get("kode")!).value).trim().toUpperCase();
    const deskripsi = teksSel(row.getCell(kolom.get("deskripsi")!).value).replace(/\s+/g, " ").trim();
    if (!kode && !deskripsi) return;
    baris.push({ baris: nomor, kode, deskripsi, status: "baru", pesan: null });
  });

  if (baris.length === 0) return { ok: false, error: "Tidak ada data CPL pada file." };
  if (baris.length > MAKS_BARIS_IMPOR) return { ok: false, error: `Maksimal ${MAKS_BARIS_IMPOR} baris CPL per impor.` };

  const frekuensiKode = new Map<string, number>();
  for (const item of baris) {
    if (item.kode) frekuensiKode.set(item.kode, (frekuensiKode.get(item.kode) ?? 0) + 1);
  }
  for (const item of baris) {
    if (!POLA_KODE_CPL.test(item.kode)) {
      item.status = "galat";
      item.pesan = "Format kode harus CPL- diikuti 2-3 digit, contoh CPL-09.";
    } else if (!item.deskripsi) {
      item.status = "galat";
      item.pesan = "Deskripsi wajib diisi.";
    } else if (item.deskripsi.length > 500) {
      item.status = "galat";
      item.pesan = "Deskripsi maksimal 500 karakter.";
    } else if (frekuensiKode.get(item.kode)! > 1) {
      item.status = "galat";
      item.pesan = "Kode CPL muncul lebih dari sekali di file.";
    }
  }

  const kodeValid = baris.filter((item) => item.status !== "galat").map((item) => item.kode);
  const sudahAda = kodeValid.length
    ? await prisma.cPL.findMany({ where: { kode: { in: kodeValid } }, select: { kode: true } })
    : [];
  const kodeTerdaftar = new Set(sudahAda.map((item) => item.kode));
  for (const item of baris) {
    if (item.status !== "galat" && kodeTerdaftar.has(item.kode)) {
      item.status = "duplikat";
      item.pesan = "Kode sudah terdaftar; data yang ada tidak diubah.";
    }
  }

  return {
    ok: true,
    baris,
    baru: baris.filter((item) => item.status === "baru").length,
    duplikat: baris.filter((item) => item.status === "duplikat").length,
    galat: baris.filter((item) => item.status === "galat").length,
  };
}

export async function terapkanImporCPL(barisMentah: BarisImporCPL[]): Promise<{ ok: true; ditambahkan: number } | { ok: false; error: string }> {
  await pastikanAdmin();
  if (!Array.isArray(barisMentah) || barisMentah.length === 0 || barisMentah.length > MAKS_BARIS_IMPOR) {
    return { ok: false, error: `Data impor tidak valid atau melebihi batas ${MAKS_BARIS_IMPOR} baris.` };
  }

  const kodeDilihat = new Set<string>();
  const data: { kode: string; deskripsi: string }[] = [];
  for (const item of barisMentah) {
    if (!item || typeof item.kode !== "string" || typeof item.deskripsi !== "string") {
      return { ok: false, error: "Format data impor tidak valid." };
    }
    const kode = item.kode.trim().toUpperCase();
    const deskripsi = item.deskripsi.replace(/\s+/g, " ").trim();
    if (!POLA_KODE_CPL.test(kode)) return { ok: false, error: `Format kode ${kode || "(kosong)"} tidak valid.` };
    if (!deskripsi || deskripsi.length > 500) return { ok: false, error: `Deskripsi untuk ${kode} harus 1-500 karakter.` };
    if (kodeDilihat.has(kode)) return { ok: false, error: `Kode ${kode} muncul lebih dari sekali di file.` };
    kodeDilihat.add(kode);
    data.push({ kode, deskripsi });
  }

  const dibuat = await prisma.cPL.createMany({ data, skipDuplicates: true });
  revalidatePath("/admin/data-master/cpl");
  return { ok: true, ditambahkan: dibuat.count };
}

export async function createCPL(formData: FormData) {
  await pastikanAdmin();
  const kode = formData.get("kode") as string;
  const deskripsi = formData.get("deskripsi") as string;

  await prisma.cPL.create({ data: { kode, deskripsi } });

  revalidatePath("/admin/data-master/cpl");
  redirect(`/admin/data-master/cpl?berhasil=${encodeURIComponent(kode)}`);
}

export async function updateDeskripsiCPL(id: string, formData: FormData) {
  await pastikanAdmin();
  const deskripsi = ((formData.get("deskripsi") as string) ?? "").trim();

  if (!deskripsi) return { error: "Deskripsi tidak boleh kosong." };
  if (deskripsi.length > 500) return { error: "Deskripsi maksimal 500 karakter." };

  const cpl = await prisma.cPL.update({ where: { id }, data: { deskripsi } });

  revalidatePath("/admin/data-master/cpl");
  return { ok: true, kode: cpl.kode };
}

export async function deleteCPL(formData: FormData) {
  await pastikanAdmin();
  const id = formData.get("id") as string;
  await prisma.cPL.delete({ where: { id } });
  revalidatePath("/admin/data-master/cpl");
}

export async function hitungCpmkTerkait(cplId: string) {
  return prisma.cpmkCpl.count({ where: { cplId } });
}