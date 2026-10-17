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

export default async function DataMasterCPLPage() {
  const daftarCPL = await prisma.cPL.findMany({ orderBy: { kode: "asc" } });

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <CplToast />
      </Suspense>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-150">
          <h1 className="text-lg font-bold leading-6.5 text-[#111827]">
            Data Master Capaian Pembelajaran Lulusan (CPL)
          </h1>
          <p className="text-[13px] text-[#6B7280]">
            Konfigurasi profil capaian pembelajaran lulusan Prodi S1 Teknik Elektro berpedoman pada standar
            Outcome-Based Education (OBE)
          </p>
        </div>
        <TombolImporCPL />
      </div>

      <CplWorkspace daftarCPL={daftarCPL} kodeBerikutnya={kodeBerikutnya(daftarCPL.map((c) => c.kode))} />
    </div>
  );
}