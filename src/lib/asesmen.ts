import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";
import { angkaKode, bobotKePersen } from "@/lib/asesmen-util";
import { namaDenganGelar } from "@/lib/dosen";
import type { CpmkOpsi, DataAsesmen, TugasRow } from "@/components/dosen/asesmen/tipe";

/**
 * Dosen yang sedang login, dibaca dari session.user.role dan session.user.dosenId
 * (diisi oleh callback jwt/session di auth.config.ts).
 */
export async function dosenSaatIni() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "DOSEN" || !user.dosenId) return null;
  return prisma.dosen.findUnique({ where: { id: user.dosenId } });
}

export async function mataKuliahDiampu(dosenId: string, tahunAjaranId: string) {
  const [penugasan, kelas] = await Promise.all([
    prisma.penugasanDosenMK.findMany({
      where: { dosenId, tahunAjaranId },
      include: { mataKuliah: { include: { cplTerkait: { include: { cpl: true } } } } },
      orderBy: { mataKuliah: { nama: "asc" } },
    }),
    prisma.kelasMK.findMany({
      where: { dosenId, tahunAjaranId },
      include: { mataKuliah: { include: { cplTerkait: { include: { cpl: true } } } } },
      orderBy: { mataKuliah: { nama: "asc" } },
    }),
  ]);
  const hasil = new Map<string, (typeof penugasan)[number]["mataKuliah"]>();
  for (const p of penugasan) hasil.set(p.mataKuliah.id, p.mataKuliah);
  for (const k of kelas) hasil.set(k.mataKuliah.id, k.mataKuliah);
  return [...hasil.values()].sort((a, b) => a.nama.localeCompare(b.nama));
}

/** Data halaman Kelola Asesmen untuk satu mata kuliah. null = tidak ada/bukan MK yang diampu. */
export async function ambilAsesmen(dosenId: string, mataKuliahId: string, kelasId?: string): Promise<DataAsesmen | null> {
  const ta = await getTahunAjaranDosen(dosenId);
  if (!ta) return null;

  const diampu = await mataKuliahDiampu(dosenId, ta.id);
  const mk = diampu.find((m) => m.id === mataKuliahId);
  if (!mk) return null;

  const penugasan = await prisma.penugasanDosenMK.findFirst({ where: { mataKuliahId, tahunAjaranId: ta.id, dosenId } });
  const koordinator = Boolean(penugasan);
  const daftarKelas = await prisma.kelasMK.findMany({
    where: {
      mataKuliahId,
      tahunAjaranId: ta.id,
      ...(!koordinator ? { dosenId } : {}),
    },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  const kelas = kelasId ? daftarKelas.find((item) => item.id === kelasId) ?? null : daftarKelas[0] ?? null;
  if (kelasId && !kelas) return null;
  if (!koordinator && !kelas) return null;

  const whereKelas = kelas ? { OR: [{ kelasId: kelas.id }, ...(koordinator ? [{ kelasId: null }] : [])] } : { kelasId: null };

  const [pendaftaran, mahasiswaTotal] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, ...(kelas ? { kelasId: kelas.id } : {}) },
      select: { mahasiswaId: true },
    }),
    prisma.pendaftaranMK.count({ where: { mataKuliahId, tahunAjaranId: ta.id } }),
  ]);
  const [tugas, cpmk, jumlahNilai, dosen, totalSub, subTerpetakan] = await Promise.all([
    prisma.tugas.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, ...whereKelas },
      orderBy: { id: "asc" }, // cuid ~ berurutan waktu pembuatan
      include: {
        distribusi: {
          include: {
            subCpmk: {
              select: {
                id: true,
                kode: true,
                cpmkTerkait: { select: { cpmk: { select: { id: true, kode: true, mataKuliahId: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.cPMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id },
      orderBy: { kode: "asc" },
      include: {
        sub: { include: { subCpmk: true }, orderBy: { subCpmk: { kode: "asc" } } },
      },
    }),
    prisma.nilai.groupBy({
      by: ["tugasId"],
      where: {
        tahunAjaranId: ta.id,
        tugas: { mataKuliahId, ...whereKelas },
        mahasiswaId: { in: pendaftaran.map((p) => p.mahasiswaId) },
      },
      _count: { _all: true },
    }),
    prisma.dosen.findUnique({ where: { id: dosenId }, select: { nama: true, gelar: true } }),
    // Sama dengan kriteria finalisasiDistribusi: hanya Sub-CPMK yang sudah masuk hierarki CPMK.
    prisma.subCPMK.count({ where: { mataKuliahId, tahunAjaranId: ta.id, cpmkTerkait: { some: {} } } }),
    prisma.subCPMK.count({
      where: { mataKuliahId, tahunAjaranId: ta.id, cpmkTerkait: { some: {} }, distribusi: { some: {} } },
    }),
  ]);

  const masukPerTugas = new Map<string, number>(jumlahNilai.map((n): [string, number] => [n.tugasId, n._count._all]));
  const mahasiswa = pendaftaran.length;

  const rows: TugasRow[] = tugas.map((t, i) => {
    const sub = t.distribusi.map((d) => d.subCpmk);
    const cpmkUnik = new Map<string, string>();
    for (const s of sub) {
      for (const k of s.cpmkTerkait) {
        if (k.cpmk.mataKuliahId === mataKuliahId) cpmkUnik.set(k.cpmk.id, k.cpmk.kode);
      }
    }
    const masuk: number = masukPerTugas.get(t.id) ?? 0;
    return {
      id: t.id,
      kelasId: t.kelasId,
      kode: `T${i + 1}`,
      nama: t.nama,
      pertemuanKe: t.pertemuanKe,
      bobot: bobotKePersen(t.bobot),
      cpmkIds: [...cpmkUnik.keys()],
      cpmkAngka: [...cpmkUnik.values()].map(angkaKode).sort((a, b) => Number(a) - Number(b)),
      subAngka: sub.map((s) => angkaKode(s.kode)).sort((a, b) => Number(a) - Number(b)),
      subIds: sub.map((s) => s.id),
      masuk,
      total: mahasiswa,
      status: mahasiswa > 0 && masuk >= mahasiswa ? "dinilai" : masuk > 0 ? "berjalan" : "belum",
    };
  });

  const cpmkOpsi: CpmkOpsi[] = cpmk.map((c) => ({
    id: c.id,
    kode: c.kode,
    angka: angkaKode(c.kode),
    deskripsi: c.deskripsi,
    cpl: mk.cplTerkait.map(({ cpl }) => ({ kode: cpl.kode, deskripsi: cpl.deskripsi })),
    sub: c.sub.map((x) => ({ id: x.subCpmk.id, kode: x.subCpmk.kode, angka: angkaKode(x.subCpmk.kode), deskripsi: x.subCpmk.deskripsi })),
  }));

  return {
    mataKuliah: { id: mk.id, kode: mk.kode, nama: mk.nama, sks: mk.sks },
    tahunAjaran: { id: ta.id, label: ta.label, status: ta.status },
    daftarMK: diampu.map((m) => ({ id: m.id, nama: m.nama })),
    daftarKelas,
    kelas,
    koordinator,
    mahasiswa,
    mahasiswaTotal,
    dosenNama: dosen ? namaDenganGelar(dosen) : "",
    distribusiSub: { terpetakan: subTerpetakan, total: totalSub },
    tugas: rows,
    cpmk: cpmkOpsi,
    pertemuanDefault: Math.min(16, Math.max(0, ...rows.map((r) => r.pertemuanKe)) + 1),
  };
}