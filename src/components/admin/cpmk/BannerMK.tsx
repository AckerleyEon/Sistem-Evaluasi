"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MkRingkas } from "./tipe";

export function BannerMK({
  mk,
  daftarMK,
  totalBobot,
  jumlahCpmk,
  jumlahSub,
  semuaTerbuka,
  onToggleSemua,
  onKaitkanCpmk,
}: {
  mk: MkRingkas;
  daftarMK: MkRingkas[];
  totalBobot: number;
  jumlahCpmk: number;
  jumlahSub: number;
  semuaTerbuka: boolean;
  onToggleSemua: () => void;
  onKaitkanCpmk: () => void;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const kata = cari.trim().toLowerCase();
  const hasil = kata
    ? daftarMK.filter((m) => m.kode.toLowerCase().includes(kata) || m.nama.toLowerCase().includes(kata))
    : daftarMK;

  const selisih = 100 - totalBobot;
  const status =
    selisih === 0
      ? { kelas: "bg-[#DCFCE7] text-[#166534]", ikon: "✓", teks: "Total Bobot: 100% (Valid)" }
      : selisih > 0
      ? { kelas: "bg-[#FEF3C7] text-[#92400E]", ikon: "!", teks: `Total Bobot: ${totalBobot}% (Kurang ${selisih}%)` }
      : { kelas: "bg-[#FEE2E2] text-[#991B1B]", ikon: "✕", teks: `Total Bobot: ${totalBobot}% (Lebih ${-selisih}%)` };

  return (
    <div className="rounded-2xl bg-[#2F6BE8] p-5 text-white shadow-[0_4px_12px_rgba(47,107,232,.25)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="flex flex-wrap items-center gap-2">
          <div ref={ref} className="relative">
            <button
              onClick={() => setBuka((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={buka}
              className="flex h-10 items-center gap-1.5 rounded-full bg-white/20 px-4 text-sm font-semibold text-white [@media(hover:hover)]:hover:bg-white/30"
            >
              Ganti MK
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {buka && (
              <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-[#E8EAEE] bg-white text-[#111827] shadow-[0_8px_24px_rgba(16,24,40,.12)]">
                <div className="p-3">
                  <input
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari kode atau nama MK..."
                    autoFocus
                    className="h-10 w-full rounded-full bg-[#F1F3F5] px-4 text-sm outline-none placeholder:text-[#6B7280]"
                  />
                </div>
                <ul role="listbox" className="max-h-60 overflow-y-auto">
                  {hasil.length === 0 && <li className="px-4 py-5 text-center text-sm text-[#6B7280]">Tidak ditemukan.</li>}
                  {hasil.map((m) => (
                    <li key={m.id} role="option" aria-selected={m.id === mk.id}>
                      <button
                        onClick={() => {
                          setBuka(false);
                          setCari("");
                          router.push(`/admin/data-master/cpmk?mk=${m.id}`);
                        }}
                        className={`block w-full border-b border-[#F1F3F5] px-4 py-2.5 text-left text-sm last:border-0 [@media(hover:hover)]:hover:bg-[#F8FAFF] ${
                          m.id === mk.id ? "font-semibold text-[#2F6BE8]" : ""
                        }`}
                      >
                        {m.kode} • {m.nama}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={onKaitkanCpmk}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-[#2F6BE8]"
          >
            <span aria-hidden="true">+</span> Kaitkan CPMK
          </button>

          <button
            onClick={onToggleSemua}
            aria-label={semuaTerbuka ? "Tutup seluruh hierarki" : "Buka seluruh hierarki"}
            title={semuaTerbuka ? "Tutup semua" : "Buka semua"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2F6BE8]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${semuaTerbuka ? "rotate-180" : ""}`} aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}