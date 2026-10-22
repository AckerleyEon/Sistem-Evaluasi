"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { deleteCPL, hitungMataKuliahTerkait } from "@/lib/actions/cpl";
import { ModalEditCPL } from "./ModalEditCPL";
import type { CplItem } from "./CplWorkspace";

function BarisCPL({ cpl, onEdit, onDelete }: { cpl: CplItem; onEdit: (c: CplItem) => void; onDelete: (c: CplItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [terpotong, setTerpotong] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (ref.current) setTerpotong(ref.current.scrollHeight > ref.current.clientHeight + 1);
  }, [cpl.deskripsi]);

  return (
    <div className="flex items-center gap-4 border-b border-[#E8EAEE] px-6 py-6">
      <span className="w-27.5  shrink-0 whitespace-nowrap text-sm font-bold text-[#2F6BE8]">{cpl.kode}</span>
      <div className="min-w-0 flex-1">
        <p ref={ref} className={`text-sm leading-5 text-[#111827] ${expanded ? "" : "line-clamp-2"}`} style={{ overflowWrap: "anywhere" }}>
          {cpl.deskripsi}
        </p>
        {(terpotong || expanded) && (
          <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-bold text-[#2F6BE8]">
            {expanded ? "Tampilkan Lebih Sedikit" : "Baca Selengkapnya"}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onEdit(cpl)}
          aria-label={`Edit deskripsi ${cpl.kode}`}
          title={`Edit deskripsi ${cpl.kode}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(cpl)}
          aria-label={`Hapus ${cpl.kode}`}
          title={`Hapus ${cpl.kode}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#FEE2E2] [@media(hover:hover)]:hover:text-[#DC2626]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function TabelCPL({ daftar, totalSemua, kataKunci }: { daftar: CplItem[]; totalSemua: number; kataKunci: string }) {
  const [editTarget, setEditTarget] = useState<CplItem | null>(null);
  const [hapusTarget, setHapusTarget] = useState<CplItem | null>(null);
  const [jumlahTerkait, setJumlahTerkait] = useState<number | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const batalRef = useRef<HTMLButtonElement>(null);

  async function bukaDialogHapus(cpl: CplItem) {
    setHapusTarget(cpl);
    setJumlahTerkait(null);
    const jumlah = await hitungMataKuliahTerkait(cpl.id);
    setJumlahTerkait(jumlah);
    setTimeout(() => batalRef.current?.focus(), 0);
  }

  async function konfirmasiHapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    const fd = new FormData();
    fd.set("id", hapusTarget.id);
    await deleteCPL(fd);
    setMenghapus(false);
    setHapusTarget(null);
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex gap-4 border-b border-[#E8EAEE] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[.06em] text-[#6B7280]">
        <span className="w-27.5 shrink-0">Kode</span>
        <span className="flex-1">Pernyataan CPL / Deskripsi</span>
        <span className="w-23 shrink-0 text-center">Aksi</span>
      </div>

      <div style={{ maxHeight: "calc(98dvh - 420px)" }} className="min-h-50 overflow-y-auto">
        {daftar.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
            {kataKunci ? `Tidak ada CPL yang cocok dengan "${kataKunci}".` : "Belum ada CPL untuk ditampilkan."}
          </div>
        ) : (
          [...daftar]
            .sort((a, b) => {
              const nomorA = Number(a.kode.replace(/\D/g, ""));
              const nomorB = Number(b.kode.replace(/\D/g, ""));
              return nomorA - nomorB;
            })
            .map((cpl) => (
              <BarisCPL
                key={cpl.id}
                cpl={cpl}
                onEdit={setEditTarget}
                onDelete={bukaDialogHapus}
              />
            ))
        )}
      </div>

      <div className="flex h-11 items-center gap-2 bg-[#EEF3FD] px-6 text-xs text-[#111827]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        {kataKunci
          ? `Menampilkan ${daftar.length} dari ${totalSemua} capaian untuk "${kataKunci}"`
          : `Menampilkan ${totalSemua} Capaian Pembelajaran Lulusan Program Studi Teknik Elektro`}
      </div>

      {editTarget && <ModalEditCPL key={editTarget.id} cpl={editTarget} onTutup={() => setEditTarget(null)} />}

      {hapusTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-2 text-base font-bold text-[#111827]">Hapus {hapusTarget.kode}?</h2>
            <p className="mb-5 text-sm text-[#6B7280]">
              {jumlahTerkait === null
                ? "Memeriksa keterkaitan data…"
                : jumlahTerkait > 0
                ? `CPL ini terhubung ke ${jumlahTerkait} mata kuliah. Menghapusnya dapat memengaruhi perhitungan capaian terkait.`
                : "CPL ini belum terhubung ke mata kuliah manapun."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button ref={batalRef} onClick={() => setHapusTarget(null)} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
                Batal
              </button>
              <button onClick={konfirmasiHapus} disabled={menghapus} className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-60">
                {menghapus ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}