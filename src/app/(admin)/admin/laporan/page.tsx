import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Laporan Capaian" };

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ angkatan?: string }>;
}) {
  const { angkatan } = await searchParams;

  const daftarAngkatan = await prisma.mahasiswa.findMany({
    select: { angkatan: true },
    distinct: ["angkatan"],
    orderBy: { angkatan: "desc" },
  });

  const daftarCPL = await prisma.cPL.findMany({ orderBy: { kode: "asc" } });

  let rekapCPL: {
    cpl: (typeof daftarCPL)[number];
    rataRata: number | null;
    jumlahLengkap: number;
    jumlahTotal: number;
  }[] = [];

  if (angkatan) {
    const mahasiswaAngkatan = await prisma.mahasiswa.findMany({
      where: { angkatan: Number(angkatan) },
      select: { id: true },
    });
    const mahasiswaIds = mahasiswaAngkatan.map((m) => m.id);

    rekapCPL = await Promise.all(
      daftarCPL.map(async (cpl) => {
        const hasilList = await prisma.hasilCPL.findMany({
          where: { cplId: cpl.id, mahasiswaId: { in: mahasiswaIds } },
        });
        const rataRata =
          hasilList.length > 0
            ? hasilList.reduce((sum, h) => sum + h.nilai, 0) / hasilList.length
            : null;
        const jumlahLengkap = hasilList.filter((h) => h.statusLengkap).length;

        return { cpl, rataRata, jumlahLengkap, jumlahTotal: hasilList.length };
      })
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Laporan — Rekap Capaian CPL</h1>

      <form className="flex gap-2 items-end">
        <div>
          <label className="block text-sm mb-1">Angkatan</label>
          <select name="angkatan" defaultValue={angkatan ?? ""} className="border rounded px-2 py-1">
            <option value="">-- Pilih Angkatan --</option>
            {daftarAngkatan.map((a) => (
              <option key={a.angkatan} value={a.angkatan}>
                {a.angkatan}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="border rounded px-4 py-1.5">
          Tampilkan
        </button>
      </form>

      {angkatan && (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">CPL</th>
                <th className="py-2">Rata-rata Capaian</th>
                <th className="py-2">Data Lengkap</th>
              </tr>
            </thead>
            <tbody>
              {rekapCPL.map(({ cpl, rataRata, jumlahLengkap, jumlahTotal }) => (
                <tr key={cpl.id} className="border-b">
                  <td className="py-2">{cpl.kode} — {cpl.deskripsi}</td>
                  <td className="py-2">{rataRata !== null ? rataRata.toFixed(2) : "-"}</td>
                  <td className="py-2">
                    {jumlahTotal > 0 ? `${jumlahLengkap}/${jumlahTotal} mahasiswa` : "Belum ada data"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Link
            href={`/admin/laporan/mahasiswa?angkatan=${angkatan}`}
            className="text-blue-600 hover:underline text-sm"
          >
            Lihat rincian per mahasiswa →
          </Link>
        </>
      )}
    </div>
  );
}