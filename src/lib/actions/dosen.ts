"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validasiSandi } from "@/lib/sandi";

type HasilAksi = { error?: string; nip?: string; passwordSementara?: string };
export type BarisImporDosen = { nama: string; gelar: string | null; nip: string };
export type KredensialDosen = { nama: string; nip: string; passwordSementara: string };

const MAKS_UKURAN_IMPOR = 2 * 1024 * 1024;
const MAKS_BARIS_IMPOR = 500;

const POLA_NIP = /^\d{8,20}$/;
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola akun dosen.");
  }
}

function buatPasswordSementara(panjang = 10) {
  let hasil = "";
  for (let i = 0; i < panjang; i++) hasil += ALFABET[crypto.randomInt(ALFABET.length)];
  return hasil;
}

function teksSel(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return value.text;
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    return "";
  }
  return String(value);
}

async function bacaBarisImpor(formData: FormData): Promise<
  | { ok: true; baris: BarisImporDosen[] }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx)." };
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

  const baris: BarisImporDosen[] = [];
  const nipBaris = new Map<string, number>();
  const galat: string[] = [];
  worksheet.eachRow((row, nomor) => {
    const namaMentah = teksSel(row.getCell(1).value).trim();
    const gelarMentah = teksSel(row.getCell(2).value).trim();
    const nip = teksSel(row.getCell(3).value).trim();
    if (!namaMentah && !gelarMentah && !nip) return;
    if (nomor === 1 && namaMentah.toLowerCase() === "nama" && nip.toLowerCase() === "nip") return;
    if (!namaMentah) galat.push(`Baris ${nomor}: nama wajib diisi.`);
    else if (namaMentah.length > 120) galat.push(`Baris ${nomor}: nama maksimal 120 karakter.`);
    if (gelarMentah.length > 80) galat.push(`Baris ${nomor}: gelar maksimal 80 karakter.`);
    if (!/^\d{8,20}$/.test(nip)) galat.push(`Baris ${nomor}: NIP harus berupa teks angka 8-20 digit.`);
    const barisSebelumnya = nipBaris.get(nip);
    if (nip && barisSebelumnya) galat.push(`Baris ${nomor}: NIP ${nip} duplikat dengan baris ${barisSebelumnya}.`);
    if (nip) nipBaris.set(nip, nomor);
    baris.push({ nama: namaMentah, gelar: gelarMentah || null, nip });
  });

  if (galat.length > 0) return { ok: false, error: galat.slice(0, 8).join(" ") };
  if (baris.length === 0) return { ok: false, error: "File tidak berisi data dosen." };
  if (baris.length > MAKS_BARIS_IMPOR) return { ok: false, error: `Maksimal ${MAKS_BARIS_IMPOR} dosen per impor.` };
  return { ok: true, baris };
}

export async function createDosen(formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const nama = ((formData.get("nama") as string) ?? "").trim();
  const gelar = ((formData.get("gelar") as string) ?? "").trim() || null;
  const alias = ((formData.get("alias") as string) ?? "").trim() || null;
  const nip = ((formData.get("nip") as string) ?? "").trim();

  if (!nama) return { error: "Nama lengkap wajib diisi." };
  if (nama.length > 120) return { error: "Nama lengkap maksimal 120 karakter." };
  if ((alias?.length ?? 0) > 120) return { error: "Alias maksimal 120 karakter." };
  if (!POLA_NIP.test(nip)) return { error: "NIP harus berupa angka (8-20 digit)." };

  const [dosenAda, usernameAda, aliasAda] = await Promise.all([
    prisma.dosen.findUnique({ where: { nip } }),
    prisma.user.findUnique({ where: { username: nip } }),
    alias ? prisma.dosen.findFirst({ where: { alias: { equals: alias, mode: "insensitive" } } }) : null,
  ]);
  if (dosenAda || usernameAda) return { error: `NIP ${nip} sudah terdaftar.` };
  if (aliasAda) return { error: "Alias sudah digunakan dosen lain." };

  const passwordSementara = buatPasswordSementara();
  const hash = await bcrypt.hash(passwordSementara, 10);

  try {
    await prisma.user.create({
      data: {
        username: nip,
        password: hash,
        role: "DOSEN",
        dosen: { create: { nama, gelar, alias, nip } },
      },
    });
  } catch {
    return { error: "Gagal menyimpan akun. NIP mungkin baru saja didaftarkan, coba lagi." };
  }

  revalidatePath("/admin/dosen");
  return { nip, passwordSementara };
}

export async function updateDosen(id: string, formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const nama = ((formData.get("nama") as string) ?? "").trim();
  const gelar = ((formData.get("gelar") as string) ?? "").trim() || null;
  const alias = ((formData.get("alias") as string) ?? "").trim() || null;

  if (!nama) return { error: "Nama lengkap wajib diisi." };
  if (nama.length > 120) return { error: "Nama lengkap maksimal 120 karakter." };
  if ((alias?.length ?? 0) > 120) return { error: "Alias maksimal 120 karakter." };
  const aliasAda = alias
    ? await prisma.dosen.findFirst({ where: { id: { not: id }, alias: { equals: alias, mode: "insensitive" } } })
    : null;
  if (aliasAda) return { error: "Alias sudah digunakan dosen lain." };

  await prisma.dosen.update({ where: { id }, data: { nama, gelar, alias } });

  revalidatePath("/admin/dosen");
  return {};
}

export async function cekPenugasanDosen(id: string): Promise<string[]> {
  await pastikanAdmin();

  const kelas = await prisma.kelasMK.findMany({
    where: { dosenId: id },
    include: { mataKuliah: true, tahunAjaran: true },
    orderBy: [{ tahunAjaran: { label: "desc" } }, { nama: "asc" }],
  });

  return kelas.map((item) => `${item.mataKuliah.kode} ${item.mataKuliah.nama}, kelas ${item.nama} (T.A. ${item.tahunAjaran.label})`);
}

export async function deleteDosen(id: string): Promise<HasilAksi> {
  await pastikanAdmin();

  const dosen = await prisma.dosen.findUnique({
    where: { id },
  });
  if (!dosen) return { error: "Akun dosen tidak ditemukan." };
  if (await prisma.kelasMK.count({ where: { dosenId: id } })) {
    return { error: "Dosen masih menjadi pengampu kelas. Ganti pengampu kelas terlebih dahulu." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.penugasanDosenMK.deleteMany({ where: { dosenId: id } });
    await tx.dosen.delete({ where: { id } });
    await tx.user.delete({ where: { id: dosen.userId } });
  });

  revalidatePath("/admin/dosen");
  revalidatePath("/admin/data-master/mata-kuliah");
  revalidatePath("/admin");
  return {};
}

export async function analisisImporDosen(
  formData: FormData
): Promise<
  | {
      ok: true;
      baris: BarisImporDosen[];
      baru: number;
      sudahAda: number;
      akanDihapus: { nama: string; gelar: string | null; nip: string; penugasan: string[] }[];
    }
  | { ok: false; error: string }
> {
  await pastikanAdmin();
  const hasilBaca = await bacaBarisImpor(formData);
  if (!hasilBaca.ok) return hasilBaca;

  const nips = hasilBaca.baris.map((baris) => baris.nip);
  const [adaDosen, adaUsername] = await Promise.all([
    prisma.dosen.findMany({ where: { nip: { in: nips } }, select: { nip: true } }),
    prisma.user.findMany({ where: { username: { in: nips } }, select: { username: true } }),
  ]);
  const nipDosenAda = new Set(adaDosen.map((dosen) => dosen.nip));
  const nipUsernameAda = new Set(adaUsername.map((user) => user.username));
  const usernameBukanDosen = nips.find((nip) => nipUsernameAda.has(nip) && !nipDosenAda.has(nip));
  if (usernameBukanDosen) {
    return { ok: false, error: `NIP ${usernameBukanDosen} sudah dipakai akun lain dan tidak bisa dibuat sebagai dosen.` };
  }

  const nipsFile = new Set(nips);
  const dosenHilang = await prisma.dosen.findMany({
    where: { nip: { notIn: [...nipsFile] } },
    include: {
      penugasan: { include: { mataKuliah: true, tahunAjaran: true } },
    },
    orderBy: { nama: "asc" },
  });
  return {
    ok: true,
    baris: hasilBaca.baris,
    baru: hasilBaca.baris.filter((baris) => !nipDosenAda.has(baris.nip)).length,
    sudahAda: hasilBaca.baris.filter((baris) => nipDosenAda.has(baris.nip)).length,
    akanDihapus: dosenHilang.map((dosen) => ({
      nama: dosen.nama,
      gelar: dosen.gelar,
      nip: dosen.nip,
      penugasan: dosen.penugasan.map(
        (penugasan) => `${penugasan.mataKuliah.kode} ${penugasan.mataKuliah.nama} (T.A. ${penugasan.tahunAjaran.label})`
      ),
    })),
  };
}

export async function terapkanImporDosen(
  barisMentah: BarisImporDosen[],
  hapusTidakAda: boolean
): Promise<
  | { ok: true; dibuat: KredensialDosen[]; dihapus: number; dilewati: number }
  | { ok: false; error: string }
> {
  await pastikanAdmin();
  if (!Array.isArray(barisMentah) || barisMentah.length === 0 || barisMentah.length > MAKS_BARIS_IMPOR) {
    return { ok: false, error: "Data impor tidak valid atau melebihi batas baris." };
  }

  const baris: BarisImporDosen[] = [];
  const nipDilihat = new Set<string>();
  for (const barisMentahSatu of barisMentah) {
    if (
      !barisMentahSatu ||
      typeof barisMentahSatu.nama !== "string" ||
      (typeof barisMentahSatu.gelar !== "string" && barisMentahSatu.gelar !== null) ||
      typeof barisMentahSatu.nip !== "string"
    ) {
      return { ok: false, error: "Format data impor tidak valid." };
    }
    const dosen = {
      nama: barisMentahSatu.nama.trim(),
      gelar: barisMentahSatu.gelar?.trim() || null,
      nip: barisMentahSatu.nip.trim(),
    };
    if (!dosen.nama || dosen.nama.length > 120 || (dosen.gelar?.length ?? 0) > 80 || !/^\d{8,20}$/.test(dosen.nip)) {
      return { ok: false, error: `Data dosen dengan NIP ${dosen.nip || "(kosong)"} tidak valid.` };
    }
    if (nipDilihat.has(dosen.nip)) return { ok: false, error: `NIP ${dosen.nip} muncul lebih dari sekali di file.` };
    nipDilihat.add(dosen.nip);
    baris.push(dosen);
  }

  const nips = baris.map((dosen) => dosen.nip);
  const [dosenAda, userAda] = await Promise.all([
    prisma.dosen.findMany({ where: { nip: { in: nips } }, select: { nip: true } }),
    prisma.user.findMany({ where: { username: { in: nips } }, select: { username: true } }),
  ]);
  const nipDosenAda = new Set(dosenAda.map((dosen) => dosen.nip));
  const nipUserAda = new Set(userAda.map((user) => user.username));
  const bentrok = nips.find((nip) => nipUserAda.has(nip) && !nipDosenAda.has(nip));
  if (bentrok) return { ok: false, error: `NIP ${bentrok} sudah dipakai akun lain.` };

  const baru = baris.filter((dosen) => !nipDosenAda.has(dosen.nip));
  const dibuat: KredensialDosen[] = await Promise.all(
    baru.map(async (dosen) => ({
      nama: dosen.nama,
      nip: dosen.nip,
      passwordSementara: buatPasswordSementara(),
    }))
  );
  const hashes = await Promise.all(dibuat.map((dosen) => bcrypt.hash(dosen.passwordSementara, 10)));

  const nipsFile = new Set(nips);
  const dosenHilang = hapusTidakAda
    ? await prisma.dosen.findMany({
        where: { nip: { notIn: [...nipsFile] } },
        select: { id: true, userId: true },
      })
    : [];

  const kelasDosenHilang = dosenHilang.length
    ? await prisma.kelasMK.findMany({
        where: { dosenId: { in: dosenHilang.map((dosen) => dosen.id) } },
        select: { nama: true, mataKuliah: { select: { kode: true } } },
      })
    : [];
  if (kelasDosenHilang.length > 0) {
    return { ok: false, error: "Impor dibatalkan: dosen yang akan dihapus masih mengampu kelas. Ganti pengampu kelas terlebih dahulu." };
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < baru.length; i++) {
      const dosen = baru[i];
      await tx.user.create({
        data: {
          username: dosen.nip,
          password: hashes[i],
          role: "DOSEN",
          dosen: { create: { nama: dosen.nama, gelar: dosen.gelar, nip: dosen.nip } },
        },
      });
    }

    if (dosenHilang.length > 0) {
      const ids = dosenHilang.map((dosen) => dosen.id);
      await tx.penugasanDosenMK.deleteMany({ where: { dosenId: { in: ids } } });
      await tx.dosen.deleteMany({ where: { id: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: dosenHilang.map((dosen) => dosen.userId) } } });
    }
  });

  revalidatePath("/admin/dosen");
  revalidatePath("/admin/data-master/mata-kuliah");
  revalidatePath("/admin");
  return {
    ok: true,
    dibuat,
    dihapus: dosenHilang.length,
    dilewati: baris.length - baru.length,
  };
}

export async function gantiSandiDosen(id: string, formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();

  const sandi = String(formData.get("sandi") ?? "");
  const galatSandi = validasiSandi(sandi);
  if (galatSandi) return { error: galatSandi };

  const dosen = await prisma.dosen.findUnique({ where: { id } });
  if (!dosen) return { error: "Akun dosen tidak ditemukan." };

  const hash = await bcrypt.hash(sandi, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: dosen.userId },
      data: { password: hash, resetToken: null, resetTokenExpiresAt: null },
    }),
    prisma.permintaanResetSandi.updateMany({
      where: { userId: dosen.userId, status: "MENUNGGU" },
      data: { status: "SELESAI", selesaiAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/dosen");
  revalidatePath("/admin/permintaan-reset");
  return {};
}