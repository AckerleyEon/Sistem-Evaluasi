"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { bersihkanDistribusiYatim } from "@/lib/kaitkan";
import { hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

type Hasil = { error?: string; kode?: string };

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
  return {
    kode: ((formData.get("kode") as string) ?? "").trim(),
    deskripsi: ((formData.get("deskripsi") as string) ?? "").trim(),
    bobot: Number(formData.get("bobot")),
  };
}

function validasi(d: ReturnType<typeof bacaForm>): string | null {
  if (!POLA_KODE.test(d.kode)) return "Kode harus berformat CPMK-1, CPMK-2, dst.";
  if (d.deskripsi.length < 10 || d.deskripsi.length > 500) return "Deskripsi harus 10-500 karakter.";
  if (!Number.isInteger(d.bobot) || d.bobot < 1 || d.bobot > 100) return "Bobot harus bilangan bulat 1-100.";
  return null;
}

async function totalBobotLain(mataKuliahId: string, tahunAjaranId: string, kecualiId?: string) {
  const agg = await prisma.cPMK.aggregate({
    where: { mataKuliahId, tahunAjaranId, ...(kecualiId ? { id: { not: kecualiId } } : {}) },
    _sum: { bobot: true },
  });
  return agg._sum.bobot ?? 0;
}

async function hitungNilaiTerkait(subIds: string[], mataKuliahId: string) {
  if (subIds.length === 0) return 0;
  return prisma.nilai.count({
    where: { tugas: { mataKuliahId, distribusi: { some: { subCpmkId: { in: subIds } } } } },
  });
}

// CPMK baru langsung menjadi milik mata kuliah yang dipilih dan masuk hierarkinya.
export async function createCPMK(mkId: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  const kembar = await prisma.cPMK.findUnique({
    where: { kode_mataKuliahId_tahunAjaranId: { kode: d.kode, mataKuliahId: mkId, tahunAjaranId: ta.id } },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai di ${mk.kode}.` };

  const sisa = 100 - (await totalBobotLain(mkId, ta.id));
  if (d.bobot > sisa) return { error: `Melebihi sisa kuota (${Math.max(0, sisa)}%).` };

  await prisma.cPMK.create({
    data: {
      kode: d.kode,
      deskripsi: d.deskripsi,
      bobot: d.bobot,
      mataKuliahId: mkId,
      tahunAjaranId: ta.id,
    },
  });
  await hitungUlangMataKuliah(mkId, ta.id);

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

  const kembar = await prisma.cPMK.findFirst({
    where: {
      kode: d.kode,
      mataKuliahId: cpmk.mataKuliahId,
      tahunAjaranId: cpmk.tahunAjaranId,
      id: { not: id },
    },
  });
  if (kembar) return { error: `Kode ${d.kode} sudah dipakai di mata kuliah ini.` };

  const sisa = 100 - (await totalBobotLain(cpmk.mataKuliahId, cpmk.tahunAjaranId, id));
  if (d.bobot > sisa) return { error: `Melebihi sisa kuota (${Math.max(0, sisa)}%).` };

  await prisma.cPMK.update({
    where: { id },
    data: {
      kode: d.kode,
      deskripsi: d.deskripsi,
      bobot: d.bobot,
    },
  });
  if (d.bobot !== cpmk.bobot) await hitungUlangMataKuliah(cpmk.mataKuliahId, cpmk.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: d.kode };
}

export async function cekDampakCPMK(id: string) {
  await pastikanAdmin();
  const cpmk = await prisma.cPMK.findUnique({
    where: { id },
    include: { sub: { select: { subCpmkId: true } } },
  });
  if (!cpmk) return { jumlahSub: 0, bobot: 0, totalSetelah: 0, jumlahNilai: 0 };

  const subIds = cpmk.sub.map((s) => s.subCpmkId);
  const [jumlahNilai, totalSetelah] = await Promise.all([
    hitungNilaiTerkait(subIds, cpmk.mataKuliahId),
    totalBobotLain(cpmk.mataKuliahId, cpmk.tahunAjaranId, id),
  ]);
  return { jumlahSub: subIds.length, bobot: cpmk.bobot, totalSetelah, jumlahNilai };
}

// Menghapus CPMK = memutus kaitannya dari hierarki. Tidak diblokir: nilai mahasiswa tidak disentuh,
// Sub-CPMK di dalamnya terlepas dan berdiri sendiri, hasil capaian dihitung ulang.
export async function hapusCPMK(id: string): Promise<Hasil> {
  await pastikanAdmin();
  const cpmk = await prisma.cPMK.findUnique({
    where: { id },
    include: { sub: { select: { subCpmkId: true } } },
  });
  if (!cpmk) return { error: "CPMK tidak ditemukan." };

  const subIds = cpmk.sub.map((s) => s.subCpmkId);

  await prisma.cPMK.delete({ where: { id } }); // kaitan CPL, Sub-CPMK, dan hasil ikut terhapus (cascade)
  await bersihkanDistribusiYatim(subIds, cpmk.mataKuliahId);
  await hitungUlangMataKuliah(cpmk.mataKuliahId, cpmk.tahunAjaranId);

  revalidatePath(HALAMAN);
  return { kode: cpmk.kode };
}