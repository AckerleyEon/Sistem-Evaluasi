import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { CplWorkspace } from "@/components/admin/cpl/CplWorkspace";
import { CplToast } from "@/components/admin/cpl/CplToast";
import { TombolImporCPL } from "@/components/admin/cpl/TombolImporCPL";

function kodeBerikutnya(daftarKode: string[]): string {
  let maks = 0;
  for (const k of daftarKode) {
    const match = k.match(/^CPL-(\d+)$/);
    if (match) maks = Math.max(maks, parseInt(match[1], 10));
  }
  return `CPL-${(maks + 1).toString().padStart(2, "0")}`;
}

function kodePLBerikutnya(daftarKode: string[]): string {
  let maks = 0;
  for (const kode of daftarKode) {
    const match = kode.match(/^PL-(\d+)$/);
    if (match) maks = Math.max(maks, parseInt(match[1], 10));
  }
  return `PL-${(maks + 1).toString().padStart(2, "0")}`;
}

export const metadata: Metadata = { title: "Data CPL" };

export default async function DataMasterCPLPage() {
  const [daftarCPL, daftarProfil] = await Promise.all([
    prisma.cPL.findMany({ orderBy: { kode: "asc" } }),
    prisma.profilLulusan.findMany({
      include: { cplTerkait: { include: { cpl: true } } },
      orderBy: { kode: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <CplToast />
      </Suspense>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-150">
          <h1 className="text-lg font-bold leading-6.5 text-[#111827]">
            Data Master CPL dan Profil Lulusan
          </h1>
          <p className="text-[13px] text-[#6B7280]">
            Kelola Capaian Pembelajaran Lulusan dan Profil Lulusan Program Studi S1 Teknik Elektro berbasis OBE.
          </p>
        </div>
        <TombolImporCPL />
      </div>

      <CplWorkspace
        daftarCPL={daftarCPL}
        daftarProfil={daftarProfil}
        kodeBerikutnya={kodeBerikutnya(daftarCPL.map((c) => c.kode))}
        kodePLBerikutnya={kodePLBerikutnya(daftarProfil.map((profil) => profil.kode))}
      />
    </div>
  );
}