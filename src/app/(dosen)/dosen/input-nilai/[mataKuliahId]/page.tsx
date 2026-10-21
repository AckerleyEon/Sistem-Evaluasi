import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cekAksesMK } from "@/lib/otorisasi";
import { InputNilaiWorkspace } from "@/components/dosen/input-nilai/InputNilaiWorkspace";

const KUNCI_PASSING_GRADE = "passingGrade";
const PASSING_GRADE_DEFAULT = 75;

export default async function InputNilaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ mataKuliahId: string }>;
  searchParams: Promise<{ kelas?: string; tugas?: string }>;
}) {
  const [{ mataKuliahId }, query, session] = await Promise.all([params, searchParams, auth()]);
  const akses = await cekAksesMK(mataKuliahId, query.kelas);
  if (!akses) notFound();
  const { ta, kelasId, koordinator } = akses;
  const arsip = ta.status === "ARSIP";
  const dosenId = session?.user.dosenId;

  const aksesMK = session?.user.role === "ADMIN"
    ? {}
    : {
        OR: [
          { penugasan: { some: { dosenId: dosenId ?? "", tahunAjaranId: ta.id } } },
          { kelas: { some: { dosenId: dosenId ?? "", tahunAjaranId: ta.id } } },
        ],
      };
  const [daftarMK, jumlahMhsPerMK, mataKuliah, daftarKelas, pengaturan] = await Promise.all([
    prisma.mataKuliah.findMany({
      where: aksesMK,
      select: { id: true, kode: true, nama: true, sks: true },
      orderBy: { kode: "asc" },
    }),
    prisma.pendaftaranMK.groupBy({
      by: ["mataKuliahId"],
      where: { tahunAjaranId: ta.id },
      _count: { _all: true },
    }),
    prisma.mataKuliah.findUnique({ where: { id: mataKuliahId }, select: { id: true, kode: true, nama: true } }),
    prisma.kelasMK.findMany({
      where: {
        mataKuliahId,
        tahunAjaranId: ta.id,
        ...(koordinator ? {} : { dosenId: dosenId ?? "" }),
      },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
    prisma.pengaturan.findUnique({ where: { kunci: KUNCI_PASSING_GRADE } }),
  ]);
  if (!mataKuliah || !daftarMK.some((mk) => mk.id === mataKuliahId)) notFound();

  const kelasFilter = kelasId
    ? { OR: [{ kelasId }, ...(koordinator ? [{ kelasId: null }] : [])] }
    : {};
  const whereTugas = { mataKuliahId, tahunAjaranId: ta.id, ...kelasFilter };
  const [daftarTugasMentah, pendaftaran] = await Promise.all([
    prisma.tugas.findMany({
      where: whereTugas,
      orderBy: [{ pertemuanKe: "asc" }, { nama: "asc" }],
      include: {
        distribusi: {
          include: {
            subCpmk: {
              select: {
                id: true,
                kode: true,
                deskripsi: true,
                cpmkTerkait: {
                  select: {
                    bobot: true,
                    cpmk: {
                      select: {
                        kode: true,
                        cpl: { select: { cpl: { select: { kode: true } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, ...(kelasId ? { kelasId } : {}) },
      select: {
        kelasId: true,
        mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true } },
      },
      orderBy: { mahasiswa: { nim: "asc" } },
    }),
  ]);

  const tugasAktif = daftarTugasMentah.find((tugas) => tugas.id === query.tugas) ?? daftarTugasMentah[0] ?? null;
  const subCpmkIds = [...new Set(tugasAktif?.distribusi.map((item) => item.subCpmk.id) ?? [])];
  const [tugasSubCpmk, nilaiTersimpan] = await Promise.all([
    subCpmkIds.length
      ? prisma.subCPMK.findMany({
          where: { id: { in: subCpmkIds }, mataKuliahId, tahunAjaranId: ta.id },
          select: {
            id: true,
            distribusi: {
              where: { tugas: { mataKuliahId, tahunAjaranId: ta.id, ...kelasFilter } },
              select: {
                tugas: { select: { id: true, nama: true, bobot: true, kelasId: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    pendaftaran.length
      ? prisma.nilai.findMany({
          where: {
            tahunAjaranId: ta.id,
            mahasiswaId: { in: pendaftaran.map((item) => item.mahasiswa.id) },
            tugas: whereTugas,
          },
          select: { mahasiswaId: true, tugasId: true, skor: true },
        })
      : Promise.resolve([]),
  ]);

  const tugasPerSub = new Map(
    tugasSubCpmk.map((sub) => [
      sub.id,
      sub.distribusi.map(({ tugas }) => ({
        id: tugas.id,
        nama: tugas.nama,
        bobot: tugas.bobot,
        kelasId: tugas.kelasId,
      })),
    ]),
  );
  const daftarMahasiswa = pendaftaran.map((item) => ({
    ...item.mahasiswa,
    kelasId: item.kelasId,
  }));
  const nilaiPerMahasiswa: Record<string, Record<string, number>> = {};
  for (const nilai of nilaiTersimpan) {
    (nilaiPerMahasiswa[nilai.mahasiswaId] ??= {})[nilai.tugasId] = nilai.skor;
  }

  const tugas = daftarTugasMentah.map((item) => ({
    id: item.id,
    nama: item.nama,
    pertemuanKe: item.pertemuanKe,
    bobot: item.bobot,
    kelasId: item.kelasId,
    indikator: item.distribusi.map(({ subCpmk }) => ({
      id: subCpmk.id,
      kode: subCpmk.kode,
      deskripsi: subCpmk.deskripsi,
      cpmk: subCpmk.cpmkTerkait.map((tautan) => ({
        kode: tautan.cpmk.kode,
        bobot: tautan.bobot,
        cpl: tautan.cpmk.cpl.map(({ cpl }) => cpl.kode),
      })),
      tugas: tugasPerSub.get(subCpmk.id) ?? [],
    })),
  }));
  const passingGrade = Math.min(
    100,
    Math.max(50, Math.round(Number(pengaturan?.nilai)) || PASSING_GRADE_DEFAULT),
  );
  const kelasMahasiswa = kelasId ? daftarKelas.find((kelas) => kelas.id === kelasId)?.nama ?? null : null;

  return (
    <InputNilaiWorkspace
      mataKuliah={mataKuliah}
      daftarMK={daftarMK.map((mk) => ({
        ...mk,
        jumlahMahasiswa: jumlahMhsPerMK.find((item) => item.mataKuliahId === mk.id)?._count._all ?? 0,
      }))}
      tahunAjaran={ta.label}
      kelasId={kelasId}
      kelasNama={kelasMahasiswa}
      semuaKelasAllowed={koordinator}
      daftarKelas={daftarKelas}
      tugas={tugas}
      tugasDipilihId={tugasAktif?.id ?? null}
      mahasiswa={daftarMahasiswa}
      nilaiPerMahasiswa={nilaiPerMahasiswa}
      passingGrade={passingGrade}
      readOnly={arsip}
    />
  );
}
