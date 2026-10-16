"use client";

import type { MkRingkas } from "./tipe";

export function BannerMK({
  mk,
  totalBobot,
  jumlahCpmk,
  jumlahSub,
  semuaTerbuka,
  onToggleSemua,
}: {
  mk: MkRingkas;
  totalBobot: number;
  jumlahCpmk: number;
  jumlahSub: number;
  semuaTerbuka: boolean;
  onToggleSemua: () => void;
}) {
  const selisih = 100 - totalBobot;
  const status =
    selisih === 0
      ? { kelas: "bg-[#DCFCE7] text-[#166534]", ikon: "✓", teks: "Total Bobot: 100% (Valid)" }
      : selisih > 0
      ? { kelas: "bg-[#FEF3C7] text-[#92400E]", ikon: "!", teks: `Total Bobot: ${totalBobot}% (Kurang ${selisih}%)` }
      : { kelas: "bg-[#FEE2E2] text-[#991B1B]", ikon: "✕", teks: `Total Bobot: ${totalBobot}% (Lebih ${-selisih}%)` };

  return (
    <div className="rounded-2xl bg-[#2F6BE8] p-5 text-white shadow-[0_4px_12px_rgba(47,107,232,.25)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-6" style={{ overflowWrap: "anywhere" }}>
            • {mk.kode} – {mk.nama} ({mk.sks} SKS)
          </h2>
          <p className="mt-1 text-xs text-white/85">
            • {jumlahCpmk} CPMK, {jumlahSub} Sub-CPMK
          </p>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.kelas}`}>
            <span aria-hidden="true">{status.ikon}</span>
            {status.teks}
          </span>
        </div>

        <button
          onClick={onToggleSemua}
          aria-label={semuaTerbuka ? "Tutup seluruh hierarki" : "Buka seluruh hierarki"}
          title={semuaTerbuka ? "Tutup semua" : "Buka semua"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2F6BE8]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${semuaTerbuka ? "rotate-180" : ""}`} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}