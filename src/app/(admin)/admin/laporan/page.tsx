import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LaporanAdminWorkspace } from "@/components/admin/laporan/LaporanAdminWorkspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Laporan Capaian CPL dan Profil Lulusan" };

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ ta?: string; angkatan?: string }>;
}) {
  const parameter = await searchParams;
  const [daftarTahunAjaran, daftarAngkatan, daftarCPL, daftarProfil, tahunAktif] = await Promise.all([
    prisma.tahunAjaran.findMany({ orderBy: { label: "desc" }, select: { id: true, label: true } }),
    prisma.mahasiswa.findMany({
      select: { angkatan: true },
      distinct: ["angkatan"],
      orderBy: { angkatan: "desc" },
    }),
    prisma.cPL.findMany({
      orderBy: { kode: "asc" },
      select: {
        id: true,
        kode: true,
        deskripsi: true,
        mataKuliahTerkait: { select: { mataKuliahId: true } },
      },
    }),
    prisma.profilLulusan.findMany({
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, nama: true },
    }),
    prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" }, select: { id: true } }),
  ]);

  const tahunAjaran =
    daftarTahunAjaran.find((item) => item.id === parameter.ta) ??
    daftarTahunAjaran.find((item) => item.id === tahunAktif?.id) ??
    daftarTahunAjaran[0] ??
    null;
  const angkatanTerpilih =
    daftarAngkatan.find((item) => String(item.angkatan) === parameter.angkatan)?.angkatan ?? null;

  if (!tahunAjaran) {
    return (
      <LaporanAdminWorkspace
        daftarTahunAjaran={[]}
        tahunAjaranId=""
        daftarAngkatan={[]}
        angkatan={null}
        dataCPL={[]}
        daftarProfil={[]}
        dataMahasiswa={[]}
      />
    );
  }

  const [mahasiswa, pemetaanCPL] = await Promise.all([
    prisma.mahasiswa.findMany({
      where: {
        ...(angkatanTerpilih === null ? {} : { angkatan: angkatanTerpilih }),
        pendaftaran: { some: { tahunAjaranId: tahunAjaran.id } },
      },
      select: { id: true, nim: true, nama: true, angkatan: true },
      orderBy: [{ angkatan: "desc" }, { nim: "asc" }],
    }),
    prisma.hasilCPL.findMany({
      where: { tahunAjaranId: tahunAjaran.id },
      select: { mahasiswaId: true, cplId: true, nilai: true, statusLengkap: true },
    }),
  ]);

  const mahasiswaIds = mahasiswa.map((item) => item.id);
  const hasilProfil = mahasiswaIds.length
    ? await prisma.hasilProfilLulusan.findMany({
        where: { tahunAjaranId: tahunAjaran.id, mahasiswaId: { in: mahasiswaIds } },
        select: {
          mahasiswaId: true,
          profilLulusanId: true,
          nilai: true,
          statusLengkap: true,
        },
      })
    : [];

  const hasilCPLTerpilih = new Set(mahasiswaIds);
  const cplPerId = new Map(
    daftarCPL.map((cpl) => [
      cpl.id,
      {
        id: cpl.id,
        kode: cpl.kode,
        deskripsi: cpl.deskripsi,
        jumlahMataKuliah: new Set(cpl.mataKuliahTerkait.map((relasi) => relasi.mataKuliahId)).size,
        hasil: [] as { mahasiswaId: string; nilai: number; statusLengkap: boolean }[],
      },
    ]),
  );
  for (const hasil of pemetaanCPL) {
    if (!hasilCPLTerpilih.has(hasil.mahasiswaId)) continue;
    cplPerId.get(hasil.cplId)?.hasil.push(hasil);
  }

  const hasilProfilPerMahasiswa = new Map<
    string,
    Map<string, { nilai: number; statusLengkap: boolean }>
  >();
  for (const hasil of hasilProfil) {
    const hasilMahasiswa = hasilProfilPerMahasiswa.get(hasil.mahasiswaId) ?? new Map();
    hasilMahasiswa.set(hasil.profilLulusanId, {
      nilai: hasil.nilai,
      statusLengkap: hasil.statusLengkap,
    });
    hasilProfilPerMahasiswa.set(hasil.mahasiswaId, hasilMahasiswa);
  }

  return (
    <LaporanAdminWorkspace
      daftarTahunAjaran={daftarTahunAjaran}
      tahunAjaranId={tahunAjaran.id}
      daftarAngkatan={daftarAngkatan.map((item) => item.angkatan)}
      angkatan={angkatanTerpilih}
      dataCPL={[...cplPerId.values()].map((cpl) => ({
        ...cpl,
        rataRata:
          cpl.hasil.length > 0
            ? cpl.hasil.reduce((total, hasil) => total + hasil.nilai, 0) / cpl.hasil.length
            : null,
        jumlahLengkap: cpl.hasil.filter((hasil) => hasil.statusLengkap).length,
        jumlahMahasiswa: cpl.hasil.length,
      }))}
      daftarProfil={daftarProfil}
      dataMahasiswa={mahasiswa.map((item) => ({
        ...item,
        hasilProfil: hasilProfilPerMahasiswa.get(item.id) ?? new Map(),
      }))}
    />
  );
}
