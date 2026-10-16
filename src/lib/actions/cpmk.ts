"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { bersihkanDistribusiYatim, parseItemKaitkan } from "@/lib/kaitkan";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

type Hasil = { error?: string; kode?: string; jumlah?: number };

const POLA_KODE = /^CPMK-\d{1,3}$/;
const HALAMAN = "/admin/data-master/cpmk";
const SALAH_TA = "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A.";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola CPMK.");
  }
}

function bacaForm(formData: FormData) {
  const bobotMentah = formData.get("bobot");
  return {
    kode: ((formData.get("kode") as string) ?? "").trim(),
    deskripsi: ((formData.get("deskripsi") as string) ?? "").trim(),
    cplIds: [...new Set(formData.getAll("cplIds") as string[])],
    bobot: bobotMentah === null || bobotMentah === "" ? null : Number(bobotMentah),
  };
}

function validasi(d: ReturnType<typeof bacaForm>): string | null {
  if (!POLA_KODE.test(d.kode)) return "Kode harus berformat CPMK-1, CPMK-2, dst.";
  if (d.deskripsi.length < 10 || d.deskripsi.length > 500) return "Deskripsi harus 10-500 karakter.";
  if (d.cplIds.length === 0) return "Pilih minimal 1 CPL.";
  return null;
}

async function cplValid(ids: string[]) {
  const ada = await prisma.cPL.count({ where: { id: { in: ids } } });
  return ada === ids.length;
}

async function totalBobotLain(mataKuliahId: string, tahunAjaranId: string, kecualiId?: string) {
  const agg = await prisma.cPMK.aggregate({
    where: { mataKuliahId, tahunAjaranId, ...(kecualiId ? { id: { not: kecualiId } } : {}) },
    _sum: { bobot: true },
  });
  return agg._sum.bobot ?? 0;
}

// Jumlah nilai mahasiswa yang terkait lewat tugas yang dipetakan ke Sub-CPMK, dibatasi pada satu mata kuliah.
async function hitungNilaiTerkait(subIds: string[], mataKuliahId: string | null) {
  if (subIds.length === 0 || !mataKuliahId) return 0;
  return prisma.nilai.count({
    where: { tugas: { mataKuliahId, distribusi: { some: { subCpmkId: { in: subIds } } } } },
  });
}

// CPMK baru berdiri sendiri (belum terkait mata kuliah). Bobot diisi saat dikaitkan.
export async function createCPMK(formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  if (!(await cplValid(d.cplIds))) return { error: "Ada CPL terpilih yang tidak ditemukan." };

  const kembar = await prisma.cPMK.findUnique({
    where: { kode_tahunAjaranId: { kode: d.kode, tahunAjaranId: ta.id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai pada T.A. ${ta.label}.` };

  await prisma.cPMK.create({
    data: {
      kode: d.kode,
      deskripsi: d.deskripsi,
      tahunAjaranId: ta.id,
      cpl: { create: d.cplIds.map((cplId) => ({ cplId })) },
    },
  });

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

export async function updateCPMK(id: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const cpmk = await prisma.cPMK.findUnique({ where: { id } });
  if (!cpmk) return { error: "CPMK tidak ditemukan." };
  if (!(await cplValid(d.cplIds))) return { error: "Ada CPL terpilih yang tidak ditemukan." };

  const kembar = await prisma.cPMK.findFirst({
    where: { kode: d.kode, tahunAjaranId: cpmk.tahunAjaranId, id: { not: id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai pada tahun ajaran ini.` };

  let bobot = cpmk.bobot;
  if (cpmk.mataKuliahId && d.bobot !== null) {
    if (!Number.isInteger(d.bobot) || d.bobot < 1 || d.bobot > 100) {
      return { error: "Bobot harus bilangan bulat 1-100." };
    }
    const sisa = 100 - (await totalBobotLain(cpmk.mataKuliahId, cpmk.tahunAjaranId, id));
    if (d.bobot > sisa) return { error: `Melebihi sisa kuota (${Math.max(0, sisa)}%).` };

    const subAgg = await prisma.cpmkSub.aggregate({ where: { cpmkId: id }, _sum: { bobot: true } });
    const totalSub = subAgg._sum.bobot ?? 0;
    if (d.bobot < totalSub) {
      return { error: `Bobot lebih kecil dari total Sub-CPMK (${totalSub}%). Kurangi bobot Sub-CPMK dulu.` };
    }
    bobot = d.bobot;
  }

  await prisma.cPMK.update({
    where: { id },
    data: {
      kode: d.kode,
      deskripsi: d.deskripsi,
      bobot,
      cpl: { deleteMany: {}, create: d.cplIds.map((cplId) => ({ cplId })) },
    },
  });

  if (cpmk.mataKuliahId && bobot !== cpmk.bobot) {
    await hitungUlangMataKuliah(cpmk.mataKuliahId, cpmk.tahunAjaranId);
  }

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

export async function kaitkanCPMK(mkId: string, itemsJson: string): Promise<Hasil> {
  await pastikanAdmin();
  const items = parseItemKaitkan(itemsJson);
  if (!items) return { error: "Data tidak valid. Setiap bobot harus bilangan bulat 1-100." };
  if (items.length === 0) return { error: "Pilih minimal 1 CPMK." };

  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) return { error: "Ada CPMK yang dipilih dua kali." };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  const daftar = await prisma.cPMK.findMany({ where: { id: { in: ids } } });
  if (daftar.length !== ids.length) return { error: "Ada CPMK yang tidak ditemukan." };
  if (daftar.some((c) => c.tahunAjaranId !== ta.id)) {
    return { error: "Ada CPMK yang bukan milik Tahun Ajaran aktif." };
  }
  if (daftar.some((c) => c.mataKuliahId !== null)) {
    return { error: "Ada CPMK yang sudah dikaitkan ke mata kuliah. Muat ulang halaman." };
  }

  const sisa = 100 - (await totalBobotLain(mkId, ta.id));
  const total = items.reduce((jumlah, i) => jumlah + i.bobot, 0);
  if (total > sisa) return { error: `Total bobot (${total}%) melebihi sisa kuota (${Math.max(0, sisa)}%).` };

  await prisma.$transaction(
    items.map((i) => prisma.cPMK.update({ where: { id: i.id }, data: { mataKuliahId: mkId, bobot: i.bobot } }))
  );
  await hitungUlangMataKuliah(mkId, ta.id);

  revalidatePath(HALAMAN);
  return { jumlah: items.length };
}

export async function cekDampakCPMK(id: string) {
  await pastikanAdmin();
  const cpmk = await prisma.cPMK.findUnique({
    where: { id },
    include: { sub: { select: { subCpmkId: true } } },
  });
  if (!cpmk) return { jumlahSub: 0, bobot: 0, totalSetelah: null as number | null, jumlahNilai: 0 };

  const subIds = cpmk.sub.map((s) => s.subCpmkId);
  const [jumlahNilai, totalSetelah] = await Promise.all([
    hitungNilaiTerkait(subIds, cpmk.mataKuliahId),
    cpmk.mataKuliahId ? totalBobotLain(cpmk.mataKuliahId, cpmk.tahunAjaranId, id) : Promise.resolve(null),
  ]);
  return { jumlahSub: subIds.length, bobot: cpmk.bobot, totalSetelah, jumlahNilai };
}

// Memutus kaitan tidak pernah diblokir. Nilai mahasiswa tidak disentuh, hasil capaian dihitung ulang.
export async function lepasCPMK(id: string): Promise<Hasil> {
  await pastikanAdmin();
  const cpmk = await prisma.cPMK.findUnique({
    where: { id },
    include: { sub: { select: { subCpmkId: true } } },
  });
  if (!cpmk) return { error: "CPMK tidak ditemukan." };
  if (!cpmk.mataKuliahId) return { error: "CPMK ini belum dikaitkan ke mata kuliah." };

  const mkId = cpmk.mataKuliahId;
  const subIds = cpmk.sub.map((s) => s.subCpmkId);

  // Sub-CPMK di dalamnya dilepas dari CPMK ini: berdiri sendiri, atau tetap bersama CPMK lain.
  await prisma.$transaction([
    prisma.cpmkSub.deleteMany({ where: { cpmkId: id } }),
    prisma.hasilCPMK.deleteMany({ where: { cpmkId: id } }),
    prisma.cPMK.update({ where: { id }, data: { mataKuliahId: null, bobot: 0 } }),
  ]);
  await bersihkanDistribusiYatim(subIds, mkId);
  await hitungUlangMataKuliah(mkId, cpmk.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: cpmk.kode };
}

// Hapus permanen tetap dijaga kalau CPMK masih punya nilai terkait di mata kuliahnya.
export async function hapusCPMK(id: string): Promise<Hasil> {
  await pastikanAdmin();
  const cpmk = await prisma.cPMK.findUnique({
    where: { id },
    include: { sub: { select: { subCpmkId: true } } },
  });
  if (!cpmk) return { error: "CPMK tidak ditemukan." };

  const subIds = cpmk.sub.map((s) => s.subCpmkId);
  if ((await hitungNilaiTerkait(subIds, cpmk.mataKuliahId)) > 0) {
    return { error: "CPMK ini masih punya nilai mahasiswa terkait. Lepas dari mata kuliah dulu, lalu hapus." };
  }

  await prisma.cPMK.delete({ where: { id } }); // kaitan ke CPL dan Sub-CPMK ikut terhapus (cascade)
  if (cpmk.mataKuliahId) {
    await bersihkanDistribusiYatim(subIds, cpmk.mataKuliahId);
    await hitungUlangMataKuliah(cpmk.mataKuliahId, cpmk.tahunAjaranId);
  }

  revalidatePath(HALAMAN);
  return { kode: cpmk.kode };
}