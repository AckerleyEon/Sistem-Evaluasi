import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { angkaKode, bobotKePersen } from "@/lib/asesmen-util";
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

export function tahunAjaranAktif() {
  return prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" } });
}

export async function mataKuliahDiampu(dosenId: string, tahunAjaranId: string) {
  const daftar = await prisma.penugasanDosenMK.findMany({
    where: { dosenId, tahunAjaranId },
    include: { mataKuliah: true },
    orderBy: { mataKuliah: { nama: "asc" } },
  });
  return daftar.map((p) => p.mataKuliah);
}

/** Data halaman Kelola Asesmen untuk satu mata kuliah. null = tidak ada/bukan MK yang diampu. */
export async function ambilAsesmen(dosenId: string, mataKuliahId: string): Promise<DataAsesmen | null> {
  const ta = await tahunAjaranAktif();
  if (!ta) return null;

  const diampu = await mataKuliahDiampu(dosenId, ta.id);
  const mk = diampu.find((m) => m.id === mataKuliahId);
  if (!mk) return null;

  const [tugas, cpmk, mahasiswa, jumlahNilai] = await Promise.all([
    prisma.tugas.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id },
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
        cpl: { include: { cpl: true } },
      },
    }),
    prisma.pendaftaranMK.count({ where: { mataKuliahId, tahunAjaranId: ta.id } }),
    prisma.nilai.groupBy({
      by: ["tugasId"],
      where: { tahunAjaranId: ta.id, tugas: { mataKuliahId } },
      _count: { _all: true },
    }),
  ]);

  const masukPerTugas = new Map<string, number>(jumlahNilai.map((n): [string, number] => [n.tugasId, n._count._all]));

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
      kode: `T${i + 1}`,
      nama: t.nama,
      pertemuanKe: t.pertemuanKe,
      bobot: bobotKePersen(t.bobot),
      cpmkIds: [...cpmkUnik.keys()],
      cpmkAngka: [...cpmkUnik.values()].map(angkaKode).sort((a, b) => Number(a) - Number(b)),
      subAngka: sub.map((s) => angkaKode(s.kode)).sort((a, b) => Number(a) - Number(b)),
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
    cpl: c.cpl.map((x) => ({ kode: x.cpl.kode, deskripsi: x.cpl.deskripsi })),
    sub: c.sub.map((x) => ({ id: x.subCpmk.id, kode: x.subCpmk.kode, angka: angkaKode(x.subCpmk.kode), deskripsi: x.subCpmk.deskripsi })),
  }));

  return {
    mataKuliah: { id: mk.id, kode: mk.kode, nama: mk.nama, sks: mk.sks },
    tahunAjaran: { id: ta.id, label: ta.label },
    daftarMK: diampu.map((m) => ({ id: m.id, nama: m.nama })),
    mahasiswa,
    tugas: rows,
    cpmk: cpmkOpsi,
    pertemuanDefault: Math.min(16, Math.max(0, ...rows.map((r) => r.pertemuanKe)) + 1),
  };
}