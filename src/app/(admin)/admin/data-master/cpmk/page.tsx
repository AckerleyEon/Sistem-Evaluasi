import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { CpmkWorkspace } from "@/components/admin/cpmk/CpmkWorkspace";

const urut = (a: { kode: string }, b: { kode: string }) =>
  a.kode.localeCompare(b.kode, undefined, { numeric: true });

export default async function KonfigurasiCpmkPage({
  searchParams,
}: {
  searchParams: Promise<{ mk?: string }>;
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

  const [daftarMK, cplMentah] = await Promise.all([
    prisma.mataKuliah.findMany({
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, nama: true, sks: true },
    }),
    prisma.cPL.findMany({ select: { id: true, kode: true } }),
  ]);

  const selectedId = daftarMK.find((m) => m.id === sp.mk)?.id ?? daftarMK[0]?.id ?? null;

  // Hanya komponen milik mata kuliah terpilih yang dimuat. Id kosong tidak cocok dengan apa pun.
  const mkId = selectedId ?? "";
  const [cpmkMentah, subMentah, tautanSub] = await Promise.all([
    prisma.cPMK.findMany({
      where: { mataKuliahId: mkId, tahunAjaranId: ta.id },
      include: { cpl: { include: { cpl: { select: { id: true, kode: true } } } } },
    }),
    prisma.subCPMK.findMany({
      where: { mataKuliahId: mkId, tahunAjaranId: ta.id },
      select: { id: true, kode: true, deskripsi: true },
    }),
    prisma.cpmkSub.findMany({
      where: { cpmk: { mataKuliahId: mkId, tahunAjaranId: ta.id } },
      select: { cpmkId: true, subCpmkId: true, bobot: true },
    }),
  ]);

  const cpmkMk = cpmkMentah
    .map((c) => ({
      id: c.id,
      kode: c.kode,
      deskripsi: c.deskripsi,
      bobot: c.bobot,
      cpl: c.cpl.map((r) => r.cpl).sort(urut),
    }))
    .sort(urut);

  return (
    <CpmkWorkspace
      daftarMK={daftarMK}
      daftarCpl={[...cplMentah].sort(urut)}
      selectedId={selectedId}
      cpmkMk={cpmkMk}
      subMk={[...subMentah].sort(urut)}
      tautanSub={tautanSub}
    />
  );
}