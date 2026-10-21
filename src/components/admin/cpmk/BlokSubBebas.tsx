"use client";

import { labelKodeSub, type KomponenSub } from "./tipe";

export function BlokSubBebas({
  daftar,
  onEdit,
  onHapus,
}: {
  daftar: KomponenSub[];
  onEdit: (s: KomponenSub) => void;
  onHapus: (s: KomponenSub) => void;
}) {
  if (daftar.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="bg-[#FFFBEB] px-5 py-4">
        <h3 className="text-sm font-bold text-[#111827]">
          Sub-CPMK belum dikaitkan <span className="font-normal text-[#92400E]">({daftar.length})</span>
        </h3>
        <p className="text-xs text-[#6B7280]">
          Berdiri sendiri di mata kuliah ini. Kaitkan lewat tombol Kaitkan Sub-CPMK pada salah satu CPMK.
        </p>
      </div>
      <ul className="divide-y divide-[#F1F3F5]">
        {daftar.map((s) => (
          <li key={s.id} className="flex items-start gap-4 px-5 py-3">
            <span title={s.kode} className="w-28 shrink-0 whitespace-nowrap text-sm font-semibold text-[#111827]">{labelKodeSub(s.kode)}</span>
            <p className="min-w-0 flex-1 text-sm text-[#4B5563]" style={{ overflowWrap: "anywhere" }}>
              {s.deskripsi}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onEdit(s)}
                aria-label={`Edit ${s.kode}`}
                title="Edit Sub-CPMK"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#EFF6FF] [@media(hover:hover)]:hover:text-[#2563EB]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                onClick={() => onHapus(s)}
                aria-label={`Hapus ${s.kode}`}
                title="Hapus Sub-CPMK"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#FEE2E2] [@media(hover:hover)]:hover:text-[#DC2626]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}