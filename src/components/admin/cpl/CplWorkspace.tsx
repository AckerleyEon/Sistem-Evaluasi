"use client";

import { useState } from "react";
import { FormCPL } from "./FormCPL";
import { ProfilLulusanWorkspace } from "./ProfilLulusanWorkspace";
import { TabelCPL } from "./TabelCPL";

export type CplItem = { id: string; kode: string; deskripsi: string };
export type ProfilLulusanItem = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  cplTerkait: { cplId: string; cpl: { id: string; kode: string; deskripsi: string } }[];
};

export function CplWorkspace({
  daftarCPL,
  daftarProfil,
  kodeBerikutnya,
  kodePLBerikutnya,
}: {
  daftarCPL: CplItem[];
  daftarProfil: ProfilLulusanItem[];
  kodeBerikutnya: string;
  kodePLBerikutnya: string;
}) {
  const [cari, setCari] = useState("");
  const [tab, setTab] = useState<"cpl" | "profil">("cpl");

  const hasilCari = cari.trim()
    ? daftarCPL.filter(
        (c) => c.kode.toLowerCase().includes(cari.toLowerCase()) || c.deskripsi.toLowerCase().includes(cari.toLowerCase())
      )
    : daftarCPL;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Kelola CPL dan Profil Lulusan" className="flex w-fit gap-1 rounded-xl bg-[#E8EEF9] p-1">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cpl"}
          onClick={() => setTab("cpl")}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${tab === "cpl" ? "bg-white text-[#1D4ED8] shadow-sm" : "text-[#64748B] hover:text-[#1D4ED8]"}`}
        >
          Capaian Pembelajaran (CPL)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profil"}
          onClick={() => setTab("profil")}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${tab === "profil" ? "bg-white text-[#1D4ED8] shadow-sm" : "text-[#64748B] hover:text-[#1D4ED8]"}`}
        >
          Profil Lulusan (PL)
        </button>
      </div>

      {tab === "profil" ? (
        <ProfilLulusanWorkspace
          daftarCPL={daftarCPL}
          daftarProfil={daftarProfil}
          kodeBerikutnya={kodePLBerikutnya}
        />
      ) : (
        <div role="tabpanel" className="grid gap-6 lg:grid-cols-[358px_minmax(0,1fr)] lg:items-start">
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

            <FormCPL key={kodeBerikutnya} kodeBerikutnya={kodeBerikutnya} kodeTerpakai={daftarCPL.map((c) => c.kode)} />
          </div>
          <div className="min-w-0" role="tabpanel">
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
      )}
    </div>
  );
}