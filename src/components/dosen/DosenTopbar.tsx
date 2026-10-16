"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

export function DosenTopbar({
  nama,
  nip,
  labelTA,
  onMenuClick,
}: {
  nama: string;
  nip: string;
  labelTA: string | null;
  onMenuClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profilRef.current && !profilRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between bg-white px-5 py-4 lg:px-6"
      style={{ borderBottom: "1px solid #E8EAEE", paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-[#111827] lg:hidden" aria-label="Buka menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold leading-7 text-[#111827]">Sistem Evaluasi CPL</h1>
            <span className="rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8]">Prodi EE</span>
          </div>
          <p className="hidden text-[13px] text-[#6B7280] sm:block">
            Cukup buat tugas dan masukkan nilainya untuk rekap evaluasi akurat.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* T.A. aktif (hanya admin yang boleh mengganti) */}
        <span className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#2F6BE8] px-3.5 text-[13px] font-semibold text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" />
          </svg>
          {labelTA ? `T.A. ${labelTA}` : "Belum ada T.A."}
        </span>

        {/* Profil */}
        <div ref={profilRef} className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5" aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="hidden text-right sm:block">
              <span className="block max-w-56 truncate text-sm font-semibold text-[#111827]" title={nama}>
                {nama}
              </span>
              <span className="block text-xs text-[#6B7280]">NIP. {nip}</span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6BE8] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
            </span>
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[#E8EAEE] bg-white py-1.5 shadow-[0_4px_16px_rgba(16,24,40,.08)]">
              <button role="menuitem" className="block w-full px-4 py-2 text-left text-sm text-[#111827] hover:bg-[#EEF3FD]">
                Profil
              </button>
              <button role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })} className="block w-full px-4 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEE2E2]">
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
