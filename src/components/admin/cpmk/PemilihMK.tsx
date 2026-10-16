"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MkRingkas } from "./tipe";

export function PemilihMK({ mk, daftarMK }: { mk: MkRingkas; daftarMK: MkRingkas[] }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setBuka((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={buka}
        className="flex h-10 max-w-85 items-center gap-2 rounded-full border border-[#D5DAE1] bg-white px-4 text-sm font-semibold text-[#111827] [@media(hover:hover)]:hover:border-[#2F6BE8]"
      >
        <span className="truncate">
          {mk.kode} • {mk.nama}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {buka && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-[#E8EAEE] bg-white shadow-[0_8px_24px_rgba(16,24,40,.12)]">
          <div className="p-3">
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari kode atau nama MK..."
              autoFocus
              className="h-10 w-full rounded-full bg-[#F1F3F5] px-4 text-sm text-[#111827] outline-none placeholder:text-[#6B7280]"
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
                    m.id === mk.id ? "font-semibold text-[#2F6BE8]" : "text-[#111827]"
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
  );
}