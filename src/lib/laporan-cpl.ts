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

export type NilaiCPMKLaporan = NilaiKomponenLaporan & {
  mataKuliahId: string;
  mataKuliahKode: string;
  mataKuliahNama: string;
};

export type NilaiSubCPMKLaporan = NilaiKomponenLaporan & {
  mataKuliahId: string;
  mataKuliahNama: string;
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
  cpmk: NilaiCPMKLaporan[];
  subCpmk: NilaiSubCPMKLaporan[];
  mahasiswa: MahasiswaLaporan[];
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
              nama: true,
              cplTerkait: { select: { cpl: { select: { id: true, kode: true } } } },
            },
          },
          sub: { select: { subCpmk: { select: { id: true } } } },
        },
      }),
      prisma.subCPMK.findMany({
        where: { tahunAjaranId: tahunAjaran.id },
        orderBy: [{ mataKuliah: { kode: "asc" } }, { kode: "asc" }],
        select: { id: true, kode: true, deskripsi: true, mataKuliah: { select: { id: true, nama: true, kode: true } } },
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

  const hasilCPLById = new Map<string, typeof hasilCPL>();
  const hasilCPMKById = new Map<string, typeof hasilCPMK>();
  const hasilSubById = new Map<string, typeof hasilSub>();
  for (const hasil of hasilCPL) {
    const daftar = hasilCPLById.get(hasil.cplId) ?? [];
    daftar.push(hasil);
    hasilCPLById.set(hasil.cplId, daftar);
  }
  for (const hasil of hasilCPMK) {
    const daftar = hasilCPMKById.get(hasil.cpmkId) ?? [];
    daftar.push(hasil);
    hasilCPMKById.set(hasil.cpmkId, daftar);
  }
  for (const hasil of hasilSub) {
    const daftar = hasilSubById.get(hasil.subCpmkId) ?? [];
    daftar.push(hasil);
    hasilSubById.set(hasil.subCpmkId, daftar);
  }

  const cplTerkaitSub = new Map<string, Set<string>>();
  for (const item of cpmkMaster) {
    const kodeCpl = item.mataKuliah.cplTerkait.map((tautan) => tautan.cpl.kode);
    for (const tautan of item.sub) {
      const kodeTerkait = cplTerkaitSub.get(tautan.subCpmk.id) ?? new Set<string>();
      for (const kode of kodeCpl) kodeTerkait.add(kode);
      cplTerkaitSub.set(tautan.subCpmk.id, kodeTerkait);
    }
  }

  const mahasiswa = [...mahasiswaMap.values()];
  const cpl = cplMaster.map((item) => {
    const nilai = hasilCPLById.get(item.id) ?? [];
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
    const nilai = hasilCPMKById.get(item.id) ?? [];
    return {
      id: item.id,
      kode: `${item.mataKuliah.kode} · ${item.kode}`,
      mataKuliahId: item.mataKuliah.id,
      mataKuliahKode: item.mataKuliah.kode,
      mataKuliahNama: item.mataKuliah.nama,
      deskripsi: item.deskripsi,
      nilai: rata(nilai.map((hasil) => hasil.nilai)) ?? 0,
      lengkap: nilai.length > 0 && nilai.every((hasil) => hasil.statusLengkap),
      cpl: item.mataKuliah.cplTerkait.map((tautan) => tautan.cpl.kode),
      jumlahData: nilai.length,
      persenTuntas: nilai.length ? (nilai.filter((hasil) => hasil.nilai >= passingGrade).length / nilai.length) * 100 : null,
    };
  });
  const subCpmk = subCpmkMaster.map((item) => {
    const nilai = hasilSubById.get(item.id) ?? [];
    return {
      id: item.id,
      kode: `${item.mataKuliah.kode} · ${item.kode}`,
      mataKuliahId: item.mataKuliah.id,
      mataKuliahNama: item.mataKuliah.nama,
      deskripsi: item.deskripsi,
      nilai: rata(nilai.map((hasil) => hasil.nilai)) ?? 0,
      lengkap: nilai.length > 0 && nilai.every((hasil) => hasil.statusLengkap),
      cpl: [...(cplTerkaitSub.get(item.id) ?? [])],
      jumlahData: nilai.length,
      persenTuntas: nilai.length ? (nilai.filter((hasil) => hasil.nilai >= passingGrade).length / nilai.length) * 100 : null,
    };
  });
  return {
    tahunAjaran: { id: tahunAjaran.id, label: tahunAjaran.label },
    passingGrade,
    totalMahasiswa: mahasiswa.length,
    cpl,
    cpmk,
    subCpmk,
    mahasiswa,
  };
}
