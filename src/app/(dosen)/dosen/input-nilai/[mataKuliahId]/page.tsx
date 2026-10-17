import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { simpanNilaiMassal } from "@/lib/actions/nilai";
import { cekAksesMK } from "@/lib/otorisasi";

export default async function InputNilaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ mataKuliahId: string }>;
  searchParams: Promise<{ kelas?: string }>;
}) {
  const { mataKuliahId } = await params;
  const { kelas: kelasQuery } = await searchParams;

  const akses = await cekAksesMK(mataKuliahId, kelasQuery);
  if (!akses) notFound();
  const { ta } = akses;
  const kelasId = akses.kelasId;
  const session = await auth();
  const daftarKelas = await prisma.kelasMK.findMany({
    where: {
      mataKuliahId,
      tahunAjaranId: ta.id,
      ...(akses.koordinator ? {} : { dosenId: session?.user.dosenId ?? "" }),
    },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });

  const mataKuliah = await prisma.mataKuliah.findUnique({ where: { id: mataKuliahId } });
  if (!mataKuliah) notFound();

  const whereTugas = {
    mataKuliahId,
    tahunAjaranId: ta.id,
    ...(kelasId
      ? { OR: [{ kelasId }, ...(akses.koordinator ? [{ kelasId: null }] : [])] }
      : {}),
  };
  const [pendaftaran, daftarTugas, nilaiTersimpan] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, ...(kelasId ? { kelasId } : {}) },
      include: { mahasiswa: true },
      orderBy: { mahasiswa: { nim: "asc" } },
    }),
    prisma.tugas.findMany({
      where: whereTugas,
      orderBy: { pertemuanKe: "asc" },
    }),
    prisma.nilai.findMany({ where: { tahunAjaranId: ta.id, tugas: whereTugas } }),
  ]);

  const daftarMahasiswa = pendaftaran.map((p) => p.mahasiswa);

  const petaNilai = new Map<string, number>();
  for (const n of nilaiTersimpan) petaNilai.set(`${n.mahasiswaId}-${n.tugasId}`, n.skor);

  const simpanWithMK = simpanNilaiMassal.bind(null, mataKuliahId, kelasId);
  const queryKelas = kelasId ? `?kelas=${encodeURIComponent(kelasId)}` : "";

  const judul = (
    <>
      <h1 className="text-xl font-semibold">
        Input Nilai — {mataKuliah.kode} {mataKuliah.nama}{kelasId ? ` · ${daftarKelas.find((kelas) => kelas.id === kelasId)?.nama ?? "Kelas"}` : ""}
      </h1>
      <p className="text-sm text-gray-500">T.A. {ta.label}</p>
    </>
  );

  if (daftarMahasiswa.length === 0) {
    return (
      <div className="p-6 space-y-2">
        {judul}
        {daftarKelas.length > 0 && <PilihKelas mataKuliahId={mataKuliahId} kelasId={kelasId} koordinator={akses.koordinator} daftarKelas={daftarKelas} />}
        <p className="text-sm text-gray-500">
          Belum ada mahasiswa terdaftar di mata kuliah ini pada T.A. {ta.label}. Hubungi admin untuk mendaftarkan mahasiswa.
        </p>
      </div>
    );
  }

  if (daftarTugas.length === 0) {
    return (
      <div className="p-6 space-y-2">
        {judul}
        {daftarKelas.length > 0 && <PilihKelas mataKuliahId={mataKuliahId} kelasId={kelasId} koordinator={akses.koordinator} daftarKelas={daftarKelas} />}
        <p className="text-sm text-gray-500">
          Belum ada tugas/komponen penilaian di mata kuliah ini. Buat dulu lewat menu Komponen Penilaian.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">{judul}</div>

      {daftarKelas.length > 0 && <PilihKelas mataKuliahId={mataKuliahId} kelasId={kelasId} koordinator={akses.koordinator} daftarKelas={daftarKelas} />}

      <Link href={`/dosen/hasil/${mataKuliahId}${queryKelas}`} className="text-blue-600 hover:underline text-sm">
        Lihat Hasil Perhitungan →
      </Link>

      <form action={simpanWithMK} className="space-y-4">
        <div className="overflow-x-auto">
          <table className="border-collapse min-w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 sticky left-0 bg-white">NIM</th>
                <th className="py-2 pr-4">Nama</th>
                {daftarTugas.map((t) => (
                  <th key={t.id} className="py-2 px-2 text-center whitespace-nowrap">
                    {t.nama}
                    <div className="text-xs font-normal text-gray-500">bobot {t.bobot}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daftarMahasiswa.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2 pr-4 sticky left-0 bg-white">{m.nim}</td>
                  <td className="py-2 pr-4">{m.nama}</td>
                  {daftarTugas.map((t) => (
                    <td key={t.id} className="py-2 px-2">
                      <input
                        type="number"
                        name={`skor-${m.id}-${t.id}`}
                        min={0}
                        max={100}
                        step="0.01"
                        defaultValue={petaNilai.get(`${m.id}-${t.id}`) ?? ""}
                        className="border rounded px-2 py-1 w-20 text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="submit" className="bg-black text-white rounded px-6 py-2">
          Simpan Semua Nilai
        </button>
      </form>
    </div>
  );
}

function PilihKelas({
  mataKuliahId,
  kelasId,
  koordinator,
  daftarKelas,
}: {
  mataKuliahId: string;
  kelasId: string | null;
  koordinator: boolean;
  daftarKelas: { id: string; nama: string }[];
}) {
  return (
    <form action={`/dosen/input-nilai/${mataKuliahId}`} method="get" className="flex items-center gap-2 text-sm">
      <label htmlFor="kelas-nilai">Kelas</label>
      <select id="kelas-nilai" name="kelas" defaultValue={kelasId ?? ""} className="rounded border px-2 py-1">
        {koordinator && <option value="">Semua kelas</option>}
        {daftarKelas.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}
      </select>
      <button type="submit" className="rounded bg-slate-100 px-2 py-1">Pilih</button>
    </form>
  );
}