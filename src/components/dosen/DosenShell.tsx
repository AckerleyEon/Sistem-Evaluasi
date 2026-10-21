"use client";

import { useState } from "react";
import { DosenSidebar } from "./DosenSidebar";
import { DosenTopbar } from "./DosenTopbar";

export function DosenShell({
  nama,
  nip,
  labelTA,
  tahunAjaranId,
  daftarTA,
  arsip,
  children,
}: {
  nama: string;
  nip: string;
  labelTA: string | null;
  tahunAjaranId: string | null;
  daftarTA: { id: string; label: string; status: "AKTIF" | "ARSIP" }[];
  arsip: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-[#F4F6FB] font-[family-name:var(--font-pjs)]">
      <a href="#konten-utama" className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1D4ED8] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Lewati ke konten utama
      </a>
      <DosenSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DosenTopbar nama={nama} nip={nip} labelTA={labelTA} tahunAjaranId={tahunAjaranId} daftarTA={daftarTA} arsip={arsip} onMenuClick={() => setDrawerOpen(true)} />
        <main id="konten-utama" className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6 print:p-0">
          {arsip && <div className="mb-4 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-2.5 text-xs font-semibold text-[#92400E]">Anda sedang melihat T.A. arsip. Data historis hanya-baca dan tidak dapat diubah.</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
