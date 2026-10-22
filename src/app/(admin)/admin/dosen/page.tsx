import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DosenWorkspace } from "@/components/admin/dosen/DosenWorkspace";

const PAGE_SIZE = 10;

export const metadata: Metadata = { title: "Kelola Akun Dosen" };

export default async function KelolaAkunDosenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: qMentah, page: halamanMentah } = await searchParams;
  const q = (qMentah ?? "").trim();
  const halamanDiminta = Math.max(1, parseInt(halamanMentah ?? "1", 10) || 1);

  const where = q
    ? {
        OR: [
          { nama: { contains: q, mode: "insensitive" as const } },
          { gelar: { contains: q, mode: "insensitive" as const } },
          {alias: {contains: q, mode: "insensitive" as const}},
          {nip: {contains: q}},
          {
            penugasan: {
              some: {
                tahunAjaran: { status: "AKTIF" as const },
                mataKuliah: {
                  OR: [
                    { nama: { contains: q, mode: "insensitive" as const } },
                    { kode: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          },
        ],
      }
    : {};

  const [total, totalHasil, mengampu, menunggu] = await Promise.all([
    prisma.dosen.count(),
    prisma.dosen.count({ where }),
    prisma.dosen.count({ where: { penugasan: { some: { tahunAjaran: { status: "AKTIF" } } } } }),
    prisma.permintaanResetSandi.count({ where: { status: "MENUNGGU" } }),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(totalHasil / PAGE_SIZE));
  const page = Math.min(halamanDiminta, totalHalaman);

  const hasil = await prisma.dosen.findMany({
    where,
    orderBy: { nama: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const daftar = hasil.map((d) => ({ id: d.id, nama: d.nama, gelar: d.gelar, alias: d.alias, nip: d.nip }));

  return (
    <div className="space-y-6">
      {menunggu > 0 && (
        <Link
          href="/admin/permintaan-reset"
          className="flex items-center justify-between rounded-2xl bg-[#FEF3C7] px-5 py-3 text-sm font-medium text-[#92400E]"
        >
          <span>{menunggu} permintaan reset kata sandi dosen menunggu ditangani.</span>
          <span className="font-semibold underline">Tangani sekarang</span>
        </Link>
      )}

      <DosenWorkspace
        total={total}
        mengampu={mengampu}
        daftar={daftar}
        q={q}
        page={page}
        totalHalaman={totalHalaman}
        totalHasil={totalHasil}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}