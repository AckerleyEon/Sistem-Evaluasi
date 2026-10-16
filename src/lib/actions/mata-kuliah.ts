"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";

type HasilAksi = { error?: string; id?: string };

const POLA_KODE = /^[A-Z]{2,4}\d{2,4}$/;
const HALAMAN = "/admin/data-master/mata-kuliah";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola mata kuliah.");
  }
}

function bacaForm(formData: FormData) {
  return {
    kode: ((formData.get("kode") as string) ?? "").trim().toUpperCase(),
    nama: ((formData.get("nama") as string) ?? "").trim(),
    sks: Number(formData.get("sks")),
    dosenId: ((formData.get("dosenId") as string) ?? "").trim(),
  };
}

function validasi(d: ReturnType<typeof bacaForm>): string | null {
  if (!POLA_KODE.test(d.kode)) return "Kode harus huruf kapital diikuti angka, contoh TE201.";
  if (d.nama.length < 3 || d.nama.length > 100) return "Nama mata kuliah harus 3-100 karakter.";
  if (!Number.isInteger(d.sks) || d.sks < 1 || d.sks > 6) return "SKS harus antara 1 sampai 6.";
  if (!d.dosenId) return "Dosen koordinator pengampu (PJMK) wajib dipilih.";
  return null;
}

export async function createMataKuliah(formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A." };

  const [kodeAda, dosen] = await Promise.all([
    prisma.mataKuliah.findUnique({ where: { kode: d.kode } }),
    prisma.dosen.findUnique({ where: { id: d.dosenId } }),
  ]);
  if (kodeAda) return { error: `Kode ${d.kode} sudah dipakai mata kuliah lain.` };
  if (!dosen) return { error: "Dosen yang dipilih tidak ditemukan." };

  const mk = await prisma.mataKuliah.create({
    data: {
      kode: d.kode,
      nama: d.nama,
      sks: d.sks,
      penugasan: { create: { dosenId: d.dosenId, tahunAjaranId: ta.id } },
    },
  });

  revalidatePath(HALAMAN);
  return { id: mk.id };
}

export async function updateMataKuliah(id: string, formData: FormData): Promise<HasilAksi> {
  await pastikanAdmin();
  const d = bacaForm(formData);
  const salah = validasi(d);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A." };

  const [mk, dosen] = await Promise.all([
    prisma.mataKuliah.findUnique({
      where: { id },
      include: { _count: { select: { cpmk: true, tugas: true, pendaftaran: true } } },
    }),
    prisma.dosen.findUnique({ where: { id: d.dosenId } }),
  ]);
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };
  if (!dosen) return { error: "Dosen yang dipilih tidak ditemukan." };

  if (d.kode !== mk.kode) {
    const terpakai = mk._count.cpmk + mk._count.tugas + mk._count.pendaftaran > 0;
    if (terpakai) {
      return { error: "Kode tidak bisa diubah karena mata kuliah sudah dipakai (mahasiswa, CPMK, atau tugas)." };
    }
    const bentrok = await prisma.mataKuliah.findUnique({ where: { kode: d.kode } });
    if (bentrok) return { error: `Kode ${d.kode} sudah dipakai mata kuliah lain.` };
  }

  await prisma.$transaction([
    prisma.mataKuliah.update({ where: { id }, data: { kode: d.kode, nama: d.nama, sks: d.sks } }),
    prisma.penugasanDosenMK.upsert({
      where: { mataKuliahId_tahunAjaranId: { mataKuliahId: id, tahunAjaranId: ta.id } },
      create: { mataKuliahId: id, tahunAjaranId: ta.id, dosenId: d.dosenId },
      update: { dosenId: d.dosenId },
    }),
  ]);

  revalidatePath(HALAMAN);
  return {};
}

export async function cekDampakHapusMK(id: string) {
  await pastikanAdmin();
  const [pendaftaran, penugasan, cpmk, tugas] = await Promise.all([
    prisma.pendaftaranMK.count({ where: { mataKuliahId: id } }),
    prisma.penugasanDosenMK.count({ where: { mataKuliahId: id } }),
    prisma.cPMK.count({ where: { mataKuliahId: id } }),
    prisma.tugas.count({ where: { mataKuliahId: id } }),
  ]);
  return { pendaftaran, penugasan, cpmk, tugas };
}

export async function hapusMataKuliah(id: string, kodeKonfirmasi: string): Promise<HasilAksi> {
  await pastikanAdmin();

  const mk = await prisma.mataKuliah.findUnique({
    where: { id },
    include: { _count: { select: { cpmk: true, tugas: true } } },
  });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };
  if (kodeKonfirmasi.trim().toUpperCase() !== mk.kode) return { error: "Kode konfirmasi tidak cocok." };
  if (mk._count.cpmk + mk._count.tugas > 0) {
    return { error: "Mata kuliah ini sudah punya CPMK atau tugas penilaian, jadi tidak bisa dihapus." };
  }

  // Pendaftaran mahasiswa dan penugasan dosen ikut terhapus (onDelete: Cascade di skema).
  await prisma.mataKuliah.delete({ where: { id } });

  revalidatePath(HALAMAN);
  return {};
}