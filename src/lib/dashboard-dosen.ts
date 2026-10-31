import { prisma } from "@/lib/prisma";
import { bobotKePersen } from "@/lib/asesmen-util";

export type DashboardDosenCourse = {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  koordinator: boolean;
  jumlahMahasiswa: number;
  kelas: { id: string; nama: string }[];
  cpmk: { id: string; kode: string; deskripsi: string }[];
  subCpmk: { id: string; kode: string; deskripsi: string }[];
  tugas: {
    id: string;
    nama: string;
    pertemuanKe: number;
    bobot: number;
    kelasId: string;
    dinilai: number;
    total: number;
  }[];
};

export type DashboardDosenData = {
  tahunAjaran: string;
  totalSks: number;
  totalSubCpmk: number;
  mataKuliah: DashboardDosenCourse[];
};

export async function ambilDashboardDosen(dosenId: string, tahunAjaranId: string | null): Promise<DashboardDosenData | null> {
  if (!tahunAjaranId) return null;
  const tahunAjaran = await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } });
  if (!tahunAjaran) return null;

  const dataMataKuliah = await prisma.mataKuliah.findMany({
    where: {
      OR: [
        { penugasan: { some: { dosenId, tahunAjaranId: tahunAjaran.id } } },
        { kelas: { some: { dosenId, tahunAjaranId: tahunAjaran.id } } },
      ],
    },
    orderBy: { kode: "asc" },
    select: {
      id: true,
      kode: true,
      nama: true,
      sks: true,
      penugasan: {
        where: { dosenId, tahunAjaranId: tahunAjaran.id },
        select: { id: true },
      },
      kelas: {
        where: { tahunAjaranId: tahunAjaran.id },
        select: { id: true, nama: true, dosenId: true },
        orderBy: { nama: "asc" },
      },
      cpmk: {
        where: { tahunAjaranId: tahunAjaran.id },
        select: { id: true, kode: true, deskripsi: true },
        orderBy: { kode: "asc" },
      },
      subCPMK: {
        where: { tahunAjaranId: tahunAjaran.id },
        select: { id: true, kode: true, deskripsi: true },
        orderBy: { kode: "asc" },
      },
      tugas: {
        where: { tahunAjaranId: tahunAjaran.id },
        select: {
          id: true,
          nama: true,
          pertemuanKe: true,
          bobot: true,
          kelasId: true,
          nilai: {
            where: { tahunAjaranId: tahunAjaran.id },
            select: { mahasiswaId: true },
          },
        },
        orderBy: [{ pertemuanKe: "asc" }, { nama: "asc" }],
      },
      pendaftaran: {
        where: { tahunAjaranId: tahunAjaran.id },
        select: { mahasiswaId: true, kelasId: true },
      },
    },
  });

  const mataKuliah = dataMataKuliah.map((item) => {
    const koordinator = item.penugasan.length > 0;
    const kelasDiampu = koordinator
      ? item.kelas
      : item.kelas.filter((kelas) => kelas.dosenId === dosenId);
    const idKelasDiampu = new Set(kelasDiampu.map((kelas) => kelas.id));
    const pendaftaran = koordinator
      ? item.pendaftaran
      : item.pendaftaran.filter((baris) => idKelasDiampu.has(baris.kelasId));
    const idMahasiswa = new Set(pendaftaran.map((baris) => baris.mahasiswaId));
    const tugas = item.tugas
      .filter((tugasItem) => koordinator || idKelasDiampu.has(tugasItem.kelasId))
      .map((tugasItem) => {
        const mahasiswaRelevan = pendaftaran
          .filter((baris) => baris.kelasId === tugasItem.kelasId)
          .map((baris) => baris.mahasiswaId);
        const peserta = new Set(mahasiswaRelevan);
        const dinilai = new Set(
          tugasItem.nilai
            .map((nilai) => nilai.mahasiswaId)
            .filter((mahasiswaId) => peserta.has(mahasiswaId)),
        ).size;

        return {
          id: tugasItem.id,
          nama: tugasItem.nama,
          pertemuanKe: tugasItem.pertemuanKe,
          bobot: bobotKePersen(tugasItem.bobot),
          kelasId: tugasItem.kelasId,
          dinilai,
          total: peserta.size,
        };
      });

    return {
      id: item.id,
      kode: item.kode,
      nama: item.nama,
      sks: item.sks,
      koordinator,
      jumlahMahasiswa: idMahasiswa.size,
      kelas: kelasDiampu.map(({ id, nama }) => ({ id, nama })),
      cpmk: item.cpmk,
      subCpmk: item.subCPMK,
      tugas,
    };
  });

  const subCpmkUnik = new Set(mataKuliah.flatMap((item) => item.subCpmk.map((sub) => sub.id)));
  return {
    tahunAjaran: tahunAjaran.label,
    totalSks: mataKuliah.reduce((total, item) => total + item.sks, 0),
    totalSubCpmk: subCpmkUnik.size,
    mataKuliah,
  };
}
