import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { CplWorkspace } from "@/components/admin/cpl/CplWorkspace";
import { CplToast } from "@/components/admin/cpl/CplToast";

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
        <button
          type="button"
          disabled
          title="Segera hadir — ekspor ke Excel/PDF"
          className="flex h-11 cursor-not-allowed items-center gap-2 rounded-[10px] bg-[#2F6BE8]/40 px-6 text-[15px] font-semibold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
            <path d="M5 19h14" />
          </svg>
          Ekspor Data
        </button>
      </div>

      <CplWorkspace daftarCPL={daftarCPL} kodeBerikutnya={kodeBerikutnya(daftarCPL.map((c) => c.kode))} />
    </div>
  );
}