import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";

export type NilaiKomponenLaporan = {
  id: string;
  kode: string;
  deskripsi: string;
  nilai: number;
  lengkap: boolean;
  cpl: string[];
  jumlahData: number;
  persenTuntas: number | null;
};

export type MahasiswaLaporan = {
  id: string;
  nim: string;
  nama: string;
  angkatan: number;
  rataCPL: number | null;
  cpl: Record<string, { nilai: number; lengkap: boolean }>;
  cpmk: Record<string, { nilai: number; lengkap: boolean }>;
  subCpmk: Record<string, { nilai: number; lengkap: boolean }>;
};

export type DataLaporanCPL = {
  tahunAjaran: { id: string; label: string };
  passingGrade: number;
  totalMahasiswa: number;
  cpl: (NilaiKomponenLaporan & { jumlahMK: number })[];
  cpmk: NilaiKomponenLaporan[];
  subCpmk: NilaiKomponenLaporan[];
  mahasiswa: MahasiswaLaporan[];
  relasi: { cplId: string; cpmkId: string; subCpmkId: string }[];
};

function rata(nilai: number[]) {
  return nilai.length ? nilai.reduce((jumlah, item) => jumlah + item, 0) / nilai.length : null;
}

export function kategoriMutu(nilai: number | null): "A" | "B" | "C" | "D" | null {
  if (nilai === null) return null;
  if (nilai >= 85) return "A";
  if (nilai >= 75) return "B";
  if (nilai >= 65) return "C";
  return "D";
}

export async function ambilDataLaporanCPL(tahunAjaranId?: string): Promise<DataLaporanCPL | null> {
  const tahunAjaran = tahunAjaranId
    ? await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } })
    : await getTahunAjaranAktif();
  if (!tahunAjaran) return null;

  const [pengaturan, cplMaster, cpmkMaster, subCpmkMaster, pendaftaran, hasilCPL, hasilCPMK, hasilSub] =
    await Promise.all([
      prisma.pengaturan.findUnique({ where: { kunci: "passingGrade" }, select: { nilai: true } }),
      prisma.cPL.findMany({
        orderBy: { kode: "asc" },
        select: {
          id: true,
          kode: true,
          deskripsi: true,
          mataKuliahTerkait: { select: { mataKuliahId: true } },
        },
      }),
      prisma.cPMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        orderBy: [{ mataKuliah: { kode: "asc" } }, { kode: "asc" }],
        select: {
          id: true,
          kode: true,
          deskripsi: true,
          mataKuliah: {
            select: {
              id: true,
              kode: true,
              cplTerkait: { select: { cpl: { select: { id: true, kode: true } } } },
            },
          },
          sub: { select: { subCpmk: { select: { id: true } } } },
        },
      }),
      prisma.subCPMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        orderBy: [{ mataKuliah: { kode: "asc" } }, { kode: "asc" }],
        select: { id: true, kode: true, deskripsi: true, mataKuliah: { select: { kode: true } } },
      }),
      prisma.pendaftaranMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        select: { mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true } } },
        orderBy: { mahasiswa: { nim: "asc" } },
      }),
      prisma.hasilCPL.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        select: { mahasiswaId: true, cplId: true, nilai: true, statusLengkap: true },
      }),
      prisma.hasilCPMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        select: { mahasiswaId: true, cpmkId: true, nilai: true, statusLengkap: true },
      }),
      prisma.hasilSubCPMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        select: { mahasiswaId: true, subCpmkId: true, nilai: true, statusLengkap: true },
      }),
    ]);

  const passingGrade = Math.min(100, Math.max(50, Math.round(Number(pengaturan?.nilai)) || 75));
  const mahasiswaMap = new Map<string, MahasiswaLaporan>();
  for (const { mahasiswa } of pendaftaran) {
    if (!mahasiswaMap.has(mahasiswa.id)) {
      mahasiswaMap.set(mahasiswa.id, {
        ...mahasiswa,
        rataCPL: null,
        cpl: {},
        cpmk: {},
        subCpmk: {},
      });
    }
  }

  for (const hasil of hasilCPL) {
    const mahasiswa = mahasiswaMap.get(hasil.mahasiswaId);
    if (mahasiswa) mahasiswa.cpl[hasil.cplId] = { nilai: hasil.nilai, lengkap: hasil.statusLengkap };
  }
  for (const hasil of hasilCPMK) {
    const mahasiswa = mahasiswaMap.get(hasil.mahasiswaId);
    if (mahasiswa) mahasiswa.cpmk[hasil.cpmkId] = { nilai: hasil.nilai, lengkap: hasil.statusLengkap };
  }
  for (const hasil of hasilSub) {
    const mahasiswa = mahasiswaMap.get(hasil.mahasiswaId);
    if (mahasiswa) mahasiswa.subCpmk[hasil.subCpmkId] = { nilai: hasil.nilai, lengkap: hasil.statusLengkap };
  }
  for (const mahasiswa of mahasiswaMap.values()) {
    mahasiswa.rataCPL = rata(Object.values(mahasiswa.cpl).map((hasil) => hasil.nilai));
  }

  const mahasiswa = [...mahasiswaMap.values()];
  const cpl = cplMaster.map((item) => {
    const nilai = hasilCPL.filter((hasil) => hasil.cplId === item.id);
    return {
      id: item.id,
      kode: item.kode,
      deskripsi: item.deskripsi,
      nilai: rata(nilai.map((hasil) => hasil.nilai)) ?? 0,
      lengkap: nilai.length > 0 && nilai.every((hasil) => hasil.statusLengkap),
      cpl: [],
      jumlahData: nilai.length,
      persenTuntas: nilai.length ? (nilai.filter((hasil) => hasil.nilai >= passingGrade).length / nilai.length) * 100 : null,
      jumlahMK: item.mataKuliahTerkait.length,
    };
  });
  const cpmk = cpmkMaster.map((item) => {
    const nilai = hasilCPMK.filter((hasil) => hasil.cpmkId === item.id);
    return {
      id: item.id,
      kode: `${item.mataKuliah.kode} · ${item.kode}`,
      deskripsi: item.deskripsi,
      nilai: rata(nilai.map((hasil) => hasil.nilai)) ?? 0,
      lengkap: nilai.length > 0 && nilai.every((hasil) => hasil.statusLengkap),
      cpl: item.mataKuliah.cplTerkait.map((tautan) => tautan.cpl.kode),
      jumlahData: nilai.length,
      persenTuntas: nilai.length ? (nilai.filter((hasil) => hasil.nilai >= passingGrade).length / nilai.length) * 100 : null,
    };
  });
  const subCpmk = subCpmkMaster.map((item) => {
    const nilai = hasilSub.filter((hasil) => hasil.subCpmkId === item.id);
    const cplTerkait = new Set(
      cpmkMaster
        .filter((c) => c.sub.some((tautan) => tautan.subCpmk.id === item.id))
        .flatMap((c) => c.mataKuliah.cplTerkait.map((tautan) => tautan.cpl.kode)),
    );
    return {
      id: item.id,
      kode: `${item.mataKuliah.kode} · ${item.kode}`,
      deskripsi: item.deskripsi,
      nilai: rata(nilai.map((hasil) => hasil.nilai)) ?? 0,
      lengkap: nilai.length > 0 && nilai.every((hasil) => hasil.statusLengkap),
      cpl: [...cplTerkait],
      jumlahData: nilai.length,
      persenTuntas: nilai.length ? (nilai.filter((hasil) => hasil.nilai >= passingGrade).length / nilai.length) * 100 : null,
    };
  });
  const relasi = cpmkMaster.flatMap((item) =>
    item.sub.flatMap((tautan) =>
      item.mataKuliah.cplTerkait.map((cplTautan) => ({
        cplId: cplTautan.cpl.id,
        cpmkId: item.id,
        subCpmkId: tautan.subCpmk.id,
      })),
    ),
  );

  return {
    tahunAjaran: { id: tahunAjaran.id, label: tahunAjaran.label },
    passingGrade,
    totalMahasiswa: mahasiswa.length,
    cpl,
    cpmk,
    subCpmk,
    mahasiswa,
    relasi,
  };
}
