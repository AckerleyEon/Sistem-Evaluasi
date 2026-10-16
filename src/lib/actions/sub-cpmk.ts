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

async function hitungNilai(subId: string, mataKuliahId: string) {
  return prisma.nilai.count({
    where: { tugas: { mataKuliahId, distribusi: { some: { subCpmkId: subId } } } },
  });
}

// Sub-CPMK baru menjadi milik mata kuliah yang dipilih dan berdiri sendiri sampai dikaitkan ke CPMK.
export async function createSubCPMK(mkId: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  const kembar = await prisma.subCPMK.findUnique({
    where: { mataKuliahId_tahunAjaranId_kode: { kode: d.kode, mataKuliahId: mkId, tahunAjaranId: ta.id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai di ${mk.kode}.` };

  await prisma.subCPMK.create({
    data: { kode: d.kode, deskripsi: d.deskripsi, mataKuliahId: mkId, tahunAjaranId: ta.id },
  });

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

// Mengubah kode dan deskripsi. Kalau cpmkId dan bobot ikut dikirim, bobot Sub-CPMK di CPMK itu ikut diubah.
export async function updateSubCPMK(id: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const sub = await prisma.subCPMK.findUnique({ where: { id } });
  if (!sub) return { error: "Sub-CPMK tidak ditemukan." };

  const kembar = await prisma.subCPMK.findFirst({
    where: { kode: d.kode, mataKuliahId: sub.mataKuliahId, tahunAjaranId: sub.tahunAjaranId, id: { not: id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai di mata kuliah ini.` };

  let ubahBobot: { tautanId: string; bobot: number } | null = null;
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
    if (d.bobot !== tautan.bobot) ubahBobot = { tautanId: tautan.id, bobot: d.bobot };
  }

  const kodeBaru = d.kode;
  const deskripsiBaru = d.deskripsi;
  await prisma.$transaction(async (tx) => {
    await tx.subCPMK.update({ where: { id }, data: { kode: kodeBaru, deskripsi: deskripsiBaru } });
    if (ubahBobot) await tx.cpmkSub.update({ where: { id: ubahBobot.tautanId }, data: { bobot: ubahBobot.bobot } });
  });
  if (ubahBobot) await hitungUlangMataKuliah(sub.mataKuliahId, sub.tahunAjaranId);

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

  const daftar = await prisma.subCPMK.findMany({
    where: { id: { in: ids } },
    include: { cpmkTerkait: { where: { cpmkId }, select: { id: true } } },
  });
  if (daftar.length !== ids.length) return { error: "Ada Sub-CPMK yang tidak ditemukan." };
  if (daftar.some((s) => s.mataKuliahId !== cpmk.mataKuliahId || s.tahunAjaranId !== cpmk.tahunAjaranId)) {
    return { error: "Ada Sub-CPMK yang bukan milik mata kuliah ini." };
  }
  if (daftar.some((s) => s.cpmkTerkait.length > 0)) {
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
  if (!sub) return { bobot: 0, cpmkKode: null as string | null, lainDi: [] as string[], jumlahNilai: 0 };

  const ini = cpmkId ? sub.cpmkTerkait.find((t) => t.cpmkId === cpmkId) : undefined;
  return {
    bobot: ini?.bobot ?? 0,
    cpmkKode: ini?.cpmk.kode ?? null,
    lainDi: sub.cpmkTerkait
      .filter((t) => t.cpmkId !== cpmkId)
      .map((t) => t.cpmk.kode)
      .sort(),
    jumlahNilai: await hitungNilai(id, sub.mataKuliahId),
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

  await prisma.cpmkSub.delete({ where: { id: tautan.id } });
  await bersihkanDistribusiYatim([id], tautan.cpmk.mataKuliahId);
  await hitungUlangMataKuliah(tautan.cpmk.mataKuliahId, tautan.cpmk.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: tautan.subCpmk.kode };
}

// Hapus permanen tetap dijaga kalau Sub-CPMK masih punya nilai terkait (lepas dulu dari CPMK).
export async function hapusSubCPMK(id: string): Promise<Hasil> {
  await pastikanAdmin();
  const sub = await prisma.subCPMK.findUnique({
    where: { id },
    include: { cpmkTerkait: { select: { id: true } } },
  });
  if (!sub) return { error: "Sub-CPMK tidak ditemukan." };

  if ((await hitungNilai(id, sub.mataKuliahId)) > 0) {
    return { error: "Sub-CPMK ini masih punya nilai mahasiswa terkait. Lepas dari CPMK dulu, lalu hapus." };
  }

  await prisma.subCPMK.delete({ where: { id } }); // kaitan, pemetaan ke tugas, dan hasil ikut terhapus (cascade)
  if (sub.cpmkTerkait.length > 0) await hitungUlangMataKuliah(sub.mataKuliahId, sub.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: sub.kode };
}