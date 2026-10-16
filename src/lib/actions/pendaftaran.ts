"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { hitungAngkatanDariNim } from "@/lib/nim";
import { hitungUlangCPL } from "@/lib/perhitungan/hitungUlangMataKuliah";

type Hasil = { error?: string; pesan?: string; nilaiTerhapus?: number };

const POLA_NIM = /^\d{12}$/;
const HALAMAN = "/admin/data-master/mata-kuliah";
const SALAH_TA = "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A.";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola pendaftaran mahasiswa.");
  }
}

function bacaIdentitas(formData: FormData) {
  return {
    nim: ((formData.get("nim") as string) ?? "").trim(),
    nama: ((formData.get("nama") as string) ?? "").trim(),
  };
}

function validasiIdentitas(nim: string, nama: string): string | null {
  if (nama.length < 3 || nama.length > 100) return "Nama mahasiswa harus 3-100 karakter.";
  if (!POLA_NIM.test(nim)) return "NIM harus 12 digit angka.";
  return null;
}

export async function tambahMahasiswaKeKelas(mkId: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const { nim, nama } = bacaIdentitas(formData);
  const salah = validasiIdentitas(nim, nama);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  let mhs = await prisma.mahasiswa.findUnique({ where: { nim } });
  let catatan = "";
  if (!mhs) {
    mhs = await prisma.mahasiswa.create({ data: { nim, nama, angkatan: hitungAngkatanDariNim(nim) } });
  } else if (mhs.nama !== nama) {
    catatan = ` (NIM sudah terdaftar atas nama ${mhs.nama}, nama tidak diubah)`;
  }

  const sudah = await prisma.pendaftaranMK.findUnique({
    where: {
      mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId: mhs.id, mataKuliahId: mkId, tahunAjaranId: ta.id },
    },
  });
  if (sudah) return { error: `${mhs.nama} sudah terdaftar di kelas ini.` };

  await prisma.pendaftaranMK.create({ data: { mahasiswaId: mhs.id, mataKuliahId: mkId, tahunAjaranId: ta.id } });

  revalidatePath(HALAMAN);
  return { pesan: `${mhs.nama} ditambahkan ke ${mk.kode}${catatan}` };
}

export async function updateMahasiswa(id: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const { nim, nama } = bacaIdentitas(formData);
  const salah = validasiIdentitas(nim, nama);
  if (salah) return { error: salah };

  const bentrok = await prisma.mahasiswa.findUnique({ where: { nim } });
  if (bentrok && bentrok.id !== id) return { error: `NIM ${nim} sudah dipakai ${bentrok.nama}.` };

  await prisma.mahasiswa.update({ where: { id }, data: { nim, nama, angkatan: hitungAngkatanDariNim(nim) } });

  revalidatePath(HALAMAN);
  return { pesan: `Data ${nama} berhasil diperbarui` };
}

export async function cekNilaiMahasiswaDiMK(mkId: string, mahasiswaId: string): Promise<number> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return 0;
  return prisma.nilai.count({ where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } } });
}

export async function hapusDariKelas(mkId: string, mahasiswaId: string): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const pendaftaran = await prisma.pendaftaranMK.findUnique({
    where: { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } },
  });
  if (!pendaftaran) return { error: "Mahasiswa tidak terdaftar di kelas ini." };

  const nilaiTerhapus = await prisma.$transaction(async (tx) => {
    const n = await tx.nilai.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } },
    });
    await tx.hasilSubCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, mataKuliahId: mkId },
    });
    await tx.hasilCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, cpmk: { mataKuliahId: mkId } },
    });
    await tx.pendaftaranMK.delete({ where: { id: pendaftaran.id } });
    return n.count;
  });

    await hitungUlangCPL([mahasiswaId], ta.id);

  revalidatePath(HALAMAN);
  return { nilaiTerhapus };
}

export async function urungkanHapusDariKelas(mkId: string, mahasiswaId: string): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const kunci = { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } };
  const sudah = await prisma.pendaftaranMK.findUnique({ where: kunci });
  if (!sudah) {
    await prisma.pendaftaranMK.create({ data: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } });
  }

  revalidatePath(HALAMAN);
  return {};
}

export async function pindahKelas(mkId: string, mahasiswaId: string, mkTujuanId: string): Promise<Hasil> {
  await pastikanAdmin();
  if (mkId === mkTujuanId) return { error: "Pilih mata kuliah tujuan yang berbeda." };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const [asal, tujuan, sudahDiTujuan] = await Promise.all([
    prisma.pendaftaranMK.findUnique({
      where: { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } },
    }),
    prisma.mataKuliah.findUnique({ where: { id: mkTujuanId } }),
    prisma.pendaftaranMK.findUnique({
      where: {
        mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkTujuanId, tahunAjaranId: ta.id },
      },
    }),
  ]);
  if (!asal) return { error: "Mahasiswa tidak terdaftar di kelas asal." };
  if (!tujuan) return { error: "Mata kuliah tujuan tidak ditemukan." };
  if (sudahDiTujuan) return { error: `Mahasiswa sudah terdaftar di ${tujuan.kode}.` };

  const nilaiTerhapus = await prisma.$transaction(async (tx) => {
    const n = await tx.nilai.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } },
    });
    await tx.hasilSubCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, mataKuliahId: mkId },
    });
    await tx.hasilCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, cpmk: { mataKuliahId: mkId } },
    });
    await tx.pendaftaranMK.delete({ where: { id: asal.id } });
    await tx.pendaftaranMK.create({ data: { mahasiswaId, mataKuliahId: mkTujuanId, tahunAjaranId: ta.id } });
    return n.count;
  });

    await hitungUlangCPL([mahasiswaId], ta.id);

  revalidatePath(HALAMAN);
  return { nilaiTerhapus, pesan: tujuan.kode };
}