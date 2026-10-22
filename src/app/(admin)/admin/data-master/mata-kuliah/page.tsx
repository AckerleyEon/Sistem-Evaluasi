import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { namaDenganGelar } from "@/lib/dosen";
import { MkWorkspace } from "@/components/admin/mk/MkWorkspace";

const PAGE_SIZE = 8;

export const metadata: Metadata = { title: "Mata Kuliah dan Kelas" };

export default async function MkMahasiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ mk?: string; q?: string; page?: string; kelas?: string }>;
}) {
  const sp = await searchParams;
  const ta = await getTahunAjaranAktif();

  if (!ta) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h1 className="mb-1 text-lg font-bold text-[#111827]">Belum ada Tahun Ajaran aktif</h1>
        <p className="text-sm text-[#6B7280]">
          Pilih atau tambah Tahun Ajaran lewat dropdown T.A. di pojok kanan atas, lalu aktifkan.
        </p>
      </div>
    );
  }

  const [mkMentah, dosenMentah, cplMaster, grupMahasiswa, grupPerMk, grupPerKelas] = await Promise.all([
    prisma.mataKuliah.findMany({
      orderBy: { kode: "asc" },
      include: {
        penugasan: { where: { tahunAjaranId: ta.id }, include: { dosen: true } },
        kelas: { where: { tahunAjaranId: ta.id }, include: { dosen: true }, orderBy: { nama: "asc" } },
        cplTerkait: { include: { cpl: { select: { id: true, kode: true } } } },
        _count: { select: { cpmk: true, tugas: true, pendaftaran: true } },
      },
    }),
    prisma.dosen.findMany({ orderBy: { nama: "asc" } }),
    prisma.cPL.findMany({ select: { id: true, kode: true }, orderBy: { kode: "asc" } }),
    prisma.pendaftaranMK.groupBy({ by: ["mahasiswaId"], where: { tahunAjaranId: ta.id } }),
    prisma.pendaftaranMK.groupBy({
      by: ["mataKuliahId"],
      where: { tahunAjaranId: ta.id },
      _count: { _all: true },
    }),
    prisma.pendaftaranMK.groupBy({
      by: ["kelasId"],
      where: { tahunAjaranId: ta.id, kelasId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const jumlahPerMk = new Map(grupPerMk.map((g) => [g.mataKuliahId, g._count._all]));
  const jumlahPerKelas = new Map(grupPerKelas.map((g) => [g.kelasId, g._count._all]));

  const daftarMK = mkMentah.map((m) => {
    const p = m.penugasan[0];
    return {
      id: m.id,
      kode: m.kode,
      nama: m.nama,
      sks: m.sks,
      jumlahMhs: jumlahPerMk.get(m.id) ?? 0,
      pjmkId: p?.dosenId ?? null,
      pjmkNama: p ? namaDenganGelar(p.dosen) : null,
      cpl: m.cplTerkait.map(({ cpl }) => cpl),
      kelas: m.kelas.map((kelas) => ({
        id: kelas.id,
        nama: kelas.nama,
        dosenId: kelas.dosenId,
        dosenNama: kelas.dosen ? namaDenganGelar(kelas.dosen) : null,
        jumlahMhs: jumlahPerKelas.get(kelas.id) ?? 0,
      })),
      terpakai: m._count.cpmk + m._count.tugas + m._count.pendaftaran > 0,
    };
  });

  const daftarDosen = dosenMentah.map((d) => ({ id: d.id, nama: d.nama, gelar: d.gelar, nip: d.nip }));

  const selectedId = daftarMK.find((m) => m.id === sp.mk)?.id ?? daftarMK[0]?.id ?? null;

  const q = (sp.q ?? "").trim();
  const halamanDiminta = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  let mahasiswa: { id: string; nama: string; nim: string; angkatan: number; kelasId: string | null; kelasNama: string | null }[] = [];
  let totalHasil = 0;
  let totalHalaman = 1;
  let page = 1;
  const mkTerpilih = daftarMK.find((mk) => mk.id === selectedId);
  const kelasDipilih =
    mkTerpilih?.kelas.find((kelas) => kelas.id === sp.kelas) ??
    (!sp.kelas ? mkTerpilih?.kelas[0] : undefined);
  const kelasId = kelasDipilih?.id ?? null;

  if (selectedId) {
    const where = {
      mataKuliahId: selectedId,
      tahunAjaranId: ta.id,
      kelasId,
      ...(q
        ? {
            mahasiswa: {
              OR: [
                { nama: { contains: q, mode: "insensitive" as const } },
                { nim: { contains: q } },
              ],
            },
          }
        : {}),
    };

    totalHasil = await prisma.pendaftaranMK.count({ where });
    totalHalaman = Math.max(1, Math.ceil(totalHasil / PAGE_SIZE));
    page = Math.min(halamanDiminta, totalHalaman);

    const baris = await prisma.pendaftaranMK.findMany({
      where,
      include: { mahasiswa: true },
      orderBy: { mahasiswa: { nim: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    mahasiswa = baris.map((b) => ({
      id: b.mahasiswa.id,
      nama: b.mahasiswa.nama,
      nim: b.mahasiswa.nim,
      angkatan: b.mahasiswa.angkatan,
      kelasId: b.kelasId,
      kelasNama: b.kelasId ? kelasDipilih?.nama ?? null : null,
    }));
  }

  return (
    <MkWorkspace
      ta={{ id: ta.id, label: ta.label }}
      daftarMK={daftarMK}
      daftarDosen={daftarDosen}
      daftarCPL={cplMaster}
      selectedId={selectedId}
      selectedKelasId={kelasId}
      mahasiswa={mahasiswa}
      q={q}
      page={page}
      totalHalaman={totalHalaman}
      totalHasil={totalHasil}
      pageSize={PAGE_SIZE}
      stats={{
        totalMK: daftarMK.length,
        totalSks: daftarMK.reduce((jumlah, m) => jumlah + m.sks, 0),
        mahasiswaTerdaftar: grupMahasiswa.length,
        totalPendaftaran: grupPerMk.reduce((jumlah, g) => jumlah + g._count._all, 0),
      }}
    />
  );
}