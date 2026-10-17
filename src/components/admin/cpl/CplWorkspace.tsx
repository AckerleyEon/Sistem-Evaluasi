"use client";

import { useState } from "react";
import { FormCPL } from "./FormCPL";
import { TabelCPL } from "./TabelCPL";

export type CplItem = { id: string; kode: string; deskripsi: string };

export function CplWorkspace({ daftarCPL, kodeBerikutnya }: { daftarCPL: CplItem[]; kodeBerikutnya: string }) {
  const [cari, setCari] = useState("");

  const hasilCari = cari.trim()
    ? daftarCPL.filter(
        (c) => c.kode.toLowerCase().includes(cari.toLowerCase()) || c.deskripsi.toLowerCase().includes(cari.toLowerCase())
      )
    : daftarCPL;

  return (
    <div className="grid gap-6 lg:grid-cols-[358px_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-24">
        <div className="flex h-30 items-center gap-4 rounded-2xl bg-[#2F6BE8] p-6 text-white">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[22px] font-bold leading-7">Total CPL Terdaftar</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold leading-7">{daftarCPL.length}</span>
              <span className="text-lg font-normal">Capaian</span>
            </p>
          </div>
        </div>

        {/* key = kodeBerikutnya: form otomatis ter-reset setelah CPL baru tersimpan */}
        <FormCPL key={kodeBerikutnya} kodeBerikutnya={kodeBerikutnya} kodeTerpakai={daftarCPL.map((c) => c.kode)} />
      </div>

      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <div className="border-b border-[#E8EAEE] p-5">
            <div className="relative w-full max-w-95">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari kode CPL atau kata kunci profil"
                className="h-11 w-full rounded-full bg-[#F1F3F5] pl-11 pr-9 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
              />
              {cari && (
                <button onClick={() => setCari("")} aria-label="Bersihkan pencarian" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                  ✕
                </button>
              )}
            </div>
          </div>

          <TabelCPL daftar={hasilCari} totalSemua={daftarCPL.length} kataKunci={cari} />
        </div>
      </div>
    </div>
  );
}