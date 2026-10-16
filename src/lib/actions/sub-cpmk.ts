"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { bersihkanDistribusiYatim, parseItemKaitkan } from "@/lib/kaitkan";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

type Hasil = { error?: string; kode?: string; jumlah?: number };

const POLA_KODE = /^Sub-CPMK-\d{1,3}$/;
const HALAMAN = "/admin/data-master/cpmk";
const SALAH_TA = "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A.";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola Sub-CPMK.");
  }
}

function bacaForm(formData: FormData) {
  const bobotMentah = formData.get("bobot");
  const cpmkId = ((formData.get("cpmkId") as string) ?? "").trim();
  return {
    kode: ((formData.get("kode") as string) ?? "").trim(),
    deskripsi: ((formData.get("deskripsi") as string) ?? "").trim(),
    cpmkId: cpmkId || null,
    bobot: bobotMentah === null || bobotMentah === "" ? null : Number(bobotMentah),
  };
}

function validasi(d: ReturnType<typeof bacaForm>): string | null {
  if (!POLA_KODE.test(d.kode)) return "Kode harus berformat Sub-CPMK-1, Sub-CPMK-2, dst.";
  if (d.deskripsi.length < 10 || d.deskripsi.length > 500) return "Deskripsi harus 10-500 karakter.";
  return null;
}

async function totalBobotKaitanLain(cpmkId: string, kecualiSubId?: string) {
  const agg = await prisma.cpmkSub.aggregate({
    where: { cpmkId, ...(kecualiSubId ? { subCpmkId: { not: kecualiSubId } } : {}) },
    _sum: { bobot: true },
  });
  return agg._sum.bobot ?? 0;
}

async function hitungNilai(subId: string, mataKuliahId?: string | null) {
  return prisma.nilai.count({
    where: {
      tugas: {
        ...(mataKuliahId ? { mataKuliahId } : {}),
        distribusi: { some: { subCpmkId: subId } },
      },
    },
  });
}

// Sub-CPMK baru berdiri sendiri (belum terkait CPMK). Bobot diisi saat dikaitkan.
export async function createSubCPMK(formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const kembar = await prisma.subCPMK.findUnique({
    where: { kode_tahunAjaranId: { kode: d.kode, tahunAjaranId: ta.id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai pada T.A. ${ta.label}.` };

  await prisma.subCPMK.create({ data: { kode: d.kode, deskripsi: d.deskripsi, tahunAjaranId: ta.id } });

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

// Mengubah kode dan deskripsi. Kalau cpmkId dan bobot ikut dikirim, bobot kaitan ke CPMK itu ikut diubah.
export async function updateSubCPMK(id: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const sub = await prisma.subCPMK.findUnique({ where: { id } });
  if (!sub) return { error: "Sub-CPMK tidak ditemukan." };

  const kembar = await prisma.subCPMK.findFirst({
    where: { kode: d.kode, tahunAjaranId: sub.tahunAjaranId, id: { not: id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai pada tahun ajaran ini.` };

  let ubahBobot: { tautanId: string; bobot: number; mataKuliahId: string | null } | null = null;
  if (d.cpmkId && d.bobot !== null) {
    if (!Number.isInteger(d.bobot) || d.bobot < 1 || d.bobot > 100) {
      return { error: "Bobot harus bilangan bulat 1-100." };
    }
    const tautan = await prisma.cpmkSub.findUnique({
      where: { cpmkId_subCpmkId: { cpmkId: d.cpmkId, subCpmkId: id } },
      include: { cpmk: true },
    });
    if (!tautan) return { error: "Kaitan ke CPMK tidak ditemukan." };

    const sisa = tautan.cpmk.bobot - (await totalBobotKaitanLain(d.cpmkId, id));
    if (d.bobot > sisa) return { error: `Melebihi sisa kuota (${Math.max(0, sisa)}%).` };

    if (d.bobot !== tautan.bobot) {
      ubahBobot = { tautanId: tautan.id, bobot: d.bobot, mataKuliahId: tautan.cpmk.mataKuliahId };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.subCPMK.update({ where: { id }, data: { kode: d.kode, deskripsi: d.deskripsi } });
    if (ubahBobot) await tx.cpmkSub.update({ where: { id: ubahBobot.tautanId }, data: { bobot: ubahBobot.bobot } });
  });

  if (ubahBobot?.mataKuliahId) await hitungUlangMataKuliah(ubahBobot.mataKuliahId, sub.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

export async function kaitkanSubCPMK(cpmkId: string, itemsJson: string): Promise<Hasil> {
  await pastikanAdmin();
  const items = parseItemKaitkan(itemsJson);
  if (!items) return { error: "Data tidak valid. Setiap bobot harus bilangan bulat 1-100." };
  if (items.length === 0) return { error: "Pilih minimal 1 Sub-CPMK." };

  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) return { error: "Ada Sub-CPMK yang dipilih dua kali." };

  const cpmk = await prisma.cPMK.findUnique({ where: { id: cpmkId } });
  if (!cpmk) return { error: "CPMK tidak ditemukan." };
  if (!cpmk.mataKuliahId) return { error: "CPMK ini belum dikaitkan ke mata kuliah. Kaitkan dulu CPMK-nya." };

  const daftar = await prisma.subCPMK.findMany({
    where: { id: { in: ids } },
    include: { cpmkTerkait: { select: { cpmkId: true } } },
  });
  if (daftar.length !== ids.length) return { error: "Ada Sub-CPMK yang tidak ditemukan." };
  if (daftar.some((s) => s.tahunAjaranId !== cpmk.tahunAjaranId)) {
    return { error: "Ada Sub-CPMK dari tahun ajaran lain." };
  }
  if (daftar.some((s) => s.cpmkTerkait.some((t) => t.cpmkId === cpmkId))) {
    return { error: "Ada Sub-CPMK yang sudah dikaitkan ke CPMK ini. Muat ulang halaman." };
  }

  const sisa = cpmk.bobot - (await totalBobotKaitanLain(cpmkId));
  const total = items.reduce((jumlah, i) => jumlah + i.bobot, 0);
  if (total > sisa) return { error: `Total bobot (${total}%) melebihi sisa kuota (${Math.max(0, sisa)}%).` };

  await prisma.cpmkSub.createMany({
    data: items.map((i) => ({ cpmkId, subCpmkId: i.id, bobot: i.bobot })),
  });
  await hitungUlangMataKuliah(cpmk.mataKuliahId, cpmk.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { jumlah: items.length };
}

// cpmkId diisi untuk dialog "lepas dari CPMK", dikosongkan untuk dialog hapus permanen.
export async function cekDampakSub(id: string, cpmkId?: string) {
  await pastikanAdmin();
  const sub = await prisma.subCPMK.findUnique({
    where: { id },
    include: { cpmkTerkait: { include: { cpmk: true } } },
  });
  if (!sub) {
    return {
      bobot: 0,
      cpmkKode: null as string | null,
      lainDiMk: [] as string[],
      lainDiTempatLain: [] as string[],
      jumlahNilai: 0,
    };
  }

  const ini = cpmkId ? sub.cpmkTerkait.find((t) => t.cpmkId === cpmkId) : undefined;
  const mkId = ini?.cpmk.mataKuliahId ?? null;
  const lain = sub.cpmkTerkait.filter((t) => t.cpmkId !== cpmkId);

  return {
    bobot: ini?.bobot ?? 0,
    cpmkKode: ini?.cpmk.kode ?? null,
    lainDiMk: mkId ? lain.filter((t) => t.cpmk.mataKuliahId === mkId).map((t) => t.cpmk.kode) : [],
    lainDiTempatLain: lain.filter((t) => !mkId || t.cpmk.mataKuliahId !== mkId).map((t) => t.cpmk.kode),
    jumlahNilai: await hitungNilai(id, mkId),
  };
}

// Memutus kaitan tidak pernah diblokir. Nilai mahasiswa tidak disentuh, hasil capaian dihitung ulang.
export async function lepasSubCPMK(id: string, cpmkId: string): Promise<Hasil> {
  await pastikanAdmin();
  const tautan = await prisma.cpmkSub.findUnique({
    where: { cpmkId_subCpmkId: { cpmkId, subCpmkId: id } },
    include: { cpmk: true, subCpmk: true },
  });
  if (!tautan) return { error: "Kaitan tidak ditemukan. Muat ulang halaman." };

  const mkId = tautan.cpmk.mataKuliahId;
  await prisma.cpmkSub.delete({ where: { id: tautan.id } });
  if (mkId) {
    await bersihkanDistribusiYatim([id], mkId);
    await hitungUlangMataKuliah(mkId, tautan.cpmk.tahunAjaranId);
  }

  revalidatePath(HALAMAN);
  return { kode: tautan.subCpmk.kode };
}

// Hapus permanen tetap dijaga kalau Sub-CPMK masih punya nilai terkait.
export async function hapusSubCPMK(id: string): Promise<Hasil> {
  await pastikanAdmin();
  const sub = await prisma.subCPMK.findUnique({
    where: { id },
    include: { cpmkTerkait: { include: { cpmk: true } } },
  });
  if (!sub) return { error: "Sub-CPMK tidak ditemukan." };

  if ((await hitungNilai(id)) > 0) {
    return { error: "Sub-CPMK ini masih punya nilai mahasiswa terkait. Lepas dari CPMK dulu, lalu hapus." };
  }

  const mkIds = [...new Set(sub.cpmkTerkait.map((t) => t.cpmk.mataKuliahId).filter((m): m is string => !!m))];

  await prisma.subCPMK.delete({ where: { id } }); // kaitan, pemetaan ke tugas, dan hasil ikut terhapus (cascade)
  for (const mkId of mkIds) await hitungUlangMataKuliah(mkId, sub.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: sub.kode };
}