import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";

const urut = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function Status({ lengkap }: { lengkap: boolean }) {
  return lengkap ? (
    <span className="text-green-600">Lengkap</span>
  ) : (
    <span className="text-orange-600">Belum Lengkap</span>
  );
}

export const metadata: Metadata = { title: "Detail Capaian Mahasiswa" };

export default async function LaporanDetailMahasiswaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mahasiswa = await prisma.mahasiswa.findUnique({ where: { id } });
  if (!mahasiswa) notFound();

  const ta = await getTahunAjaranAktif();
  if (!ta) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Belum ada Tahun Ajaran aktif. Pilih lewat dropdown T.A. di pojok kanan atas.
      </div>
    );
  }

  const where = { mahasiswaId: id, tahunAjaranId: ta.id };
  const [cplMentah, cpmkMentah, subMentah] = await Promise.all([
    prisma.hasilCPL.findMany({ where, include: { cpl: true } }),
    prisma.hasilCPMK.findMany({
      where,
      include: {
        cpmk: {
          include: {
            mataKuliah: { include: { cplTerkait: { include: { cpl: true } } } },
          },
        },
      },
    }),
    prisma.hasilSubCPMK.findMany({ where, include: { subCpmk: true, mataKuliah: true } }),
  ]);

  const hasilCPL = [...cplMentah].sort((a, b) => urut(a.cpl.kode, b.cpl.kode));
  const hasilCPMK = [...cpmkMentah].sort((a, b) =>
    urut(
      `${a.cpmk.mataKuliah?.kode ?? ""} ${a.cpmk.kode}`,
      `${b.cpmk.mataKuliah?.kode ?? ""} ${b.cpmk.kode}`
    )
  );
  const hasilSubCPMK = [...subMentah].sort((a, b) =>
    urut(`${a.mataKuliah.kode} ${a.subCpmk.kode}`, `${b.mataKuliah.kode} ${b.subCpmk.kode}`)
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">
          Laporan Capaian — {mahasiswa.nim} {mahasiswa.nama} (Angkatan {mahasiswa.angkatan})
        </h1>
        <p className="text-sm text-gray-500">T.A. {ta.label}</p>
      </div>

      <div>
        <h2 className="font-medium mb-2">Capaian CPL</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">CPL</th>
              <th className="py-2">Nilai</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {hasilCPL.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-sm text-gray-500">
                  Belum ada hasil perhitungan untuk mahasiswa ini di T.A. {ta.label}.
                </td>
              </tr>
            )}
            {hasilCPL.map((h) => (
              <tr key={h.id} className="border-b">
                <td className="py-2">{h.cpl.kode} — {h.cpl.deskripsi}</td>
                <td className="py-2">{h.nilai.toFixed(2)}</td>
                <td className="py-2"><Status lengkap={h.statusLengkap} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details>
        <summary className="cursor-pointer font-medium">Rincian CPMK (per mata kuliah)</summary>
        <table className="w-full border-collapse mt-2">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">CPMK</th>
              <th className="py-2">Mata Kuliah</th>
              <th className="py-2">CPL</th>
              <th className="py-2">Nilai</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {hasilCPMK.map((h) => (
              <tr key={h.id} className="border-b">
                <td className="py-2">{h.cpmk.kode}</td>
                <td className="py-2">{h.cpmk.mataKuliah?.kode ?? "-"}</td>
                <td className="py-2">
                  {h.cpmk.mataKuliah?.cplTerkait.map((r) => r.cpl.kode).sort(urut).join(", ") || "-"}
                </td>
                <td className="py-2">{h.nilai.toFixed(2)}</td>
                <td className="py-2"><Status lengkap={h.statusLengkap} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <details>
        <summary className="cursor-pointer font-medium">Rincian Sub-CPMK</summary>
        <table className="w-full border-collapse mt-2">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Sub-CPMK</th>
              <th className="py-2">Mata Kuliah</th>
              <th className="py-2">Nilai</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {hasilSubCPMK.map((h) => (
              <tr key={h.id} className="border-b">
                <td className="py-2">{h.subCpmk.kode}</td>
                <td className="py-2">{h.mataKuliah.kode}</td>
                <td className="py-2">{h.nilai.toFixed(2)}</td>
                <td className="py-2"><Status lengkap={h.statusLengkap} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}