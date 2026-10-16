"use client";

import { useState } from "react";
import Link from "next/link";
import type { MkItem } from "./tipe";

export function DaftarMK({
  daftarMK,
  selectedId,
  onEdit,
  onHapus,
}: {
  daftarMK: MkItem[];
  selectedId: string | null;
  onEdit: (m: MkItem) => void;
  onHapus: (m: MkItem) => void;
}) {
  const [cari, setCari] = useState("");
  const kata = cari.trim().toLowerCase();
  const hasil = kata
    ? daftarMK.filter((m) => m.kode.toLowerCase().includes(kata) || m.nama.toLowerCase().includes(kata))
    : daftarMK;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#111827]">Daftar Mata Kuliah</h2>
        <span className="rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8]">
          {daftarMK.length} MK
        </span>
      </div>

      <div className="relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari kode atau nama MK..."
          className="h-10 w-full rounded-[10px] bg-[#EEF3FD] pl-10 pr-3 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
        />
      </div>

      <ul className="mt-4 max-h-[calc(100dvh-300px)] min-h-30 space-y-3 overflow-y-auto pr-1">
        {hasil.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-[#6B7280]">
            {daftarMK.length === 0 ? "Belum ada mata kuliah." : "Mata kuliah tidak ditemukan."}
          </li>
        )}

        {hasil.map((m) => {
          const aktif = m.id === selectedId;
          const kelasTombol = `flex h-7 w-7 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2F6BE8] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9`;
          return (
            <li key={m.id} className="group relative">
              <Link
                href={`/admin/data-master/mata-kuliah?mk=${m.id}`}
                scroll={false}
                aria-current={aktif ? "true" : undefined}
                className={`block rounded-xl p-4 transition-colors ${
                  aktif
                    ? "bg-[#2F6BE8] text-white shadow-[0_4px_12px_rgba(47,107,232,.25)]"
                    : "border border-[#E8EAEE] bg-white text-[#111827] [@media(hover:hover)]:hover:bg-[#F8FAFF]"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className={`rounded-md px-1.5 py-0.5 font-semibold ${aktif ? "bg-white/20" : "bg-[#EEF3FD] text-[#2F6BE8]"}`}>
                    {m.kode}
                  </span>
                  <span className={aktif ? "text-white/80" : "text-[#6B7280]"}>{m.sks} SKS</span>
                </div>
                <p className="text-[15px] font-bold leading-5" style={{ overflowWrap: "anywhere" }}>{m.nama}</p>
                <p className={`mt-1 text-xs ${aktif ? "text-white/80" : "text-[#6B7280]"}`}>
                  {m.pjmkNama ?? "PJMK belum ditetapkan"}
                </p>
              </Link>

              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1">
                <span className={`mr-1 rounded-md px-2 py-0.5 text-xs font-semibold ${aktif ? "bg-white/20 text-white" : "bg-[#F1F3F5] text-[#6B7280]"}`}>
                  {m.jumlahMhs} Mhs
                </span>
                <div
                  className={`pointer-events-auto flex items-center gap-1 ${
                    aktif
                      ? ""
                      : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
                  }`}
                >
                  <button
                    onClick={() => onEdit(m)}
                    aria-label={`Edit mata kuliah ${m.kode}`}
                    title="Edit mata kuliah"
                    className={`${kelasTombol} ${aktif ? "text-white [@media(hover:hover)]:hover:bg-white/20" : "text-[#64748B] [@media(hover:hover)]:hover:bg-[#EFF6FF] [@media(hover:hover)]:hover:text-[#2563EB]"}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onHapus(m)}
                    aria-label={`Hapus mata kuliah ${m.kode}`}
                    title="Hapus mata kuliah"
                    className={`${kelasTombol} ${aktif ? "text-white [@media(hover:hover)]:hover:bg-white/20" : "text-[#64748B] [@media(hover:hover)]:hover:bg-[#FEF2F2] [@media(hover:hover)]:hover:text-[#DC2626]"}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}