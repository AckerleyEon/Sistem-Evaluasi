"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pilihTahunAjaranDosen } from "@/lib/actions/ta-dosen";

export function DosenTopbar({
  nama,
  nip,
  labelTA,
  tahunAjaranId,
  daftarTA,
  arsip,
  onMenuClick,
}: {
  nama: string;
  nip: string;
  labelTA: string | null;
  tahunAjaranId: string | null;
  daftarTA: { id: string; label: string; status: "AKTIF" | "ARSIP" }[];
  arsip: boolean;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [taError, setTaError] = useState("");

  return (
    <header
      className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-[#E5E9F0] bg-white/95 px-3 py-3 backdrop-blur sm:px-5 lg:px-6 print:hidden"
      style={{ paddingTop: "max(.75rem, env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-[#111827] lg:hidden" aria-label="Buka menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold leading-6 text-[#111827] sm:text-[20px] sm:leading-7">Sistem Evaluasi CPL</h1>
            <span className="hidden shrink-0 rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8] sm:inline-flex">Prodi EE</span>
          </div>
          <p className="hidden text-[13px] text-[#6B7280] md:block">
            Cukup buat tugas dan masukkan nilainya untuk rekap evaluasi akurat.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <label className={`flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold text-white sm:gap-1.5 sm:px-3.5 sm:text-[13px] ${arsip ? "bg-[#B45309]" : "bg-[#2F6BE8]"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" />
          </svg>
          <span className="sr-only">Pilih Tahun Ajaran</span>
          <select
            aria-label="Pilih Tahun Ajaran untuk menu dosen"
            value={tahunAjaranId ?? ""}
            disabled={daftarTA.length === 0}
            onChange={(event) => {
              setTaError("");
              void pilihTahunAjaranDosen(event.target.value)
                .then(() => {
                  const halamanDasar = pathname.startsWith("/dosen/input-nilai")
                    ? "/dosen/input-nilai"
                    : pathname.startsWith("/dosen/komponen-penilaian")
                      ? "/dosen/komponen-penilaian"
                      : pathname.startsWith("/dosen/hasil")
                        ? "/dosen/hasil"
                        : "/dosen";
                  router.replace(halamanDasar);
                })
                .catch((error: unknown) => {
                  setTaError(error instanceof Error ? error.message : "Tahun Ajaran gagal dipilih.");
                });
            }}
            className="max-w-32 cursor-pointer bg-transparent outline-none disabled:cursor-default sm:max-w-44"
          >
            {daftarTA.length === 0 && <option value="">{labelTA ? `T.A. ${labelTA}` : "Belum ada T.A."}</option>}
            {daftarTA.map((item) => (
              <option key={item.id} value={item.id} className="bg-white text-[#111827]">
                T.A. {item.label}{item.status === "ARSIP" ? " (Arsip)" : ""}
              </option>
            ))}
          </select>
        </label>
        {arsip && <span className="hidden rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-bold text-[#92400E] md:inline">Hanya lihat</span>}
        {taError && <span role="alert" className="absolute right-20 top-full mt-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">{taError}</span>}

        <div className="flex items-center gap-2.5">
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
        </div>
      </div>
    </header>
  );
}
