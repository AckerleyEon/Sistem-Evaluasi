import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cekAksesMK } from "@/lib/otorisasi";

const urut = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function Status({ lengkap }: { lengkap: boolean }) {
  return lengkap ? (
    <span className="text-green-600">Lengkap</span>
  ) : (
    <span className="text-orange-600">Belum Lengkap</span>
  );
}

export const metadata: Metadata = { title: "Hasil Capaian" };

export default async function HasilPerhitunganPage({
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

  const [pendaftaran, hasilSub, hasilCpmk] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id, kelasId },
      include: { mahasiswa: true },
      orderBy: { mahasiswa: { nim: "asc" } },
    }),
    prisma.hasilSubCPMK.findMany({
      where: { mataKuliahId, tahunAjaranId: ta.id },
      include: { subCpmk: true },
    }),
    prisma.hasilCPMK.findMany({
      where: { tahunAjaranId: ta.id, cpmk: { mataKuliahId } },
      include: { cpmk: true },
    }),
  ]);

  const subPerMhs = new Map<string, typeof hasilSub>();
  for (const h of hasilSub) subPerMhs.set(h.mahasiswaId, [...(subPerMhs.get(h.mahasiswaId) ?? []), h]);
  const cpmkPerMhs = new Map<string, typeof hasilCpmk>();
  for (const h of hasilCpmk) cpmkPerMhs.set(h.mahasiswaId, [...(cpmkPerMhs.get(h.mahasiswaId) ?? []), h]);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">
          Hasil Perhitungan (Preview) — {mataKuliah.kode} {mataKuliah.nama}{kelasId ? ` · ${daftarKelas.find((kelas) => kelas.id === kelasId)?.nama ?? "Kelas"}` : ""}
        </h1>
        <p className="text-sm text-gray-500">T.A. {ta.label}</p>
      </div>

      {daftarKelas.length > 0 && (
        <form action={`/dosen/hasil/${mataKuliahId}`} method="get" className="flex items-center gap-2 text-sm">
          <label htmlFor="kelas-hasil">Kelas</label>
          <select id="kelas-hasil" name="kelas" defaultValue={kelasId ?? ""} className="rounded border px-2 py-1">
            {daftarKelas.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}
          </select>
          <button type="submit" className="rounded bg-slate-100 px-2 py-1">Pilih</button>
        </form>
      )}

      {pendaftaran.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada mahasiswa terdaftar di mata kuliah ini.</p>
      )}

      {pendaftaran.map(({ mahasiswa }) => {
        const subs = [...(subPerMhs.get(mahasiswa.id) ?? [])].sort((a, b) => urut(a.subCpmk.kode, b.subCpmk.kode));
        const cpmks = [...(cpmkPerMhs.get(mahasiswa.id) ?? [])].sort((a, b) => urut(a.cpmk.kode, b.cpmk.kode));
        return (
          <div key={mahasiswa.id} className="border rounded p-4 space-y-3">
            <h2 className="font-medium">{mahasiswa.nim} — {mahasiswa.nama}</h2>

            <div>
              <p className="text-sm font-medium mb-1">Sub-CPMK</p>
              <table className="text-sm border-collapse">
                <tbody>
                  {subs.length === 0 && (
                    <tr><td className="py-1 text-gray-500">Belum ada hasil.</td></tr>
                  )}
                  {subs.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-1 pr-4">{h.subCpmk.kode}</td>
                      <td className="py-1 pr-4">{h.nilai.toFixed(2)}</td>
                      <td className="py-1"><Status lengkap={h.statusLengkap} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">CPMK</p>
              <table className="text-sm border-collapse">
                <tbody>
                  {cpmks.length === 0 && (
                    <tr><td className="py-1 text-gray-500">Belum ada hasil.</td></tr>
                  )}
                  {cpmks.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-1 pr-4">{h.cpmk.kode}</td>
                      <td className="py-1 pr-4">{h.nilai.toFixed(2)}</td>
                      <td className="py-1"><Status lengkap={h.statusLengkap} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}