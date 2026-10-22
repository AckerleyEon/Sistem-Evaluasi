"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { analisisImpor, bacaFileImpor, terapkanImpor } from "@/lib/actions/impor-mk";
import type { AnalisisImpor, BarisMentah, StatusBaris } from "@/lib/impor-mk";

const BADGE: Record<StatusBaris, { label: string; cls: string }> = {
  baru: { label: "Baru", cls: "bg-[#DCFCE7] text-[#16A34A]" },
  diperbarui: { label: "Diperbarui", cls: "bg-[#FFEDD5] text-[#EA580C]" },
  sama: { label: "Sudah ada", cls: "bg-[#F1F3F5] text-[#6B7280]" },
  galat: { label: "Galat", cls: "bg-[#FEE2E2] text-[#DC2626]" },
};

export function TombolImporMK() {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex h-10 items-center gap-2 rounded-full border border-[#E8EAEE] bg-white px-4 text-sm font-semibold text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        Impor dari Excel
      </button>
      {buka && <ModalImporMK onTutup={() => setBuka(false)} />}
    </>
  );
}

function ModalImporMK({ onTutup }: { onTutup: () => void }) {
  const router = useRouter();
  const inputFile = useRef<HTMLInputElement>(null);
  const [memuat, mulaiMemuat] = useTransition();
  const [menerapkan, mulaiTerapkan] = useTransition();
  const [galat, setGalat] = useState("");
  const [selesai, setSelesai] = useState("");
  const [mentah, setMentah] = useState<BarisMentah[] | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisImpor | null>(null);

  function pilihFile(file: File | undefined) {
    setGalat("");
    setSelesai("");
    setMentah(null);
    setAnalisis(null);
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    mulaiMemuat(async () => {
      const baca = await bacaFileImpor(fd);
      if (!baca.ok) {
        setGalat(baca.pesan);
        return;
      }
      setMentah(baca.baris);
      setAnalisis(await analisisImpor(baca.baris));
    });
  }

  function terapkan() {
    if (!mentah) return;
    setGalat("");
    mulaiTerapkan(async () => {
      const hasil = await terapkanImpor(mentah);
      if (!hasil.ok) {
        setGalat(hasil.pesan);
        return;
      }
      setSelesai(hasil.pesan);
      setMentah(null);
      setAnalisis(null);
      router.refresh();
    });
  }

  const r = analisis?.ringkasan;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-impor">
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl bg-white p-6">
        <h2 id="judul-impor" className="text-base font-bold text-[#111827]">
          Impor Mata Kuliah, Kelas &amp; Pengampu dari Excel
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          Kolom: Dosen, Kode MK, Nama MK, SKS, Kelas, Jumlah Kelas, dan CPL-1 sampai CPL-6 (isi 1 jika dipetakan, 0/kosong jika tidak).
          Kolom Semester lama diabaikan; jika kolom CPL tidak ada, pemetaan yang tersimpan tidak diubah. Baris judul wajib untuk pemetaan CPL.
          Data masuk ke T.A. aktif{analisis?.tahunAjaran ? ` (${analisis.tahunAjaran.label})` : ""}.{" "}
          <a href="/template-impor-mk.xlsx" download className="font-semibold text-[#2F6BE8] hover:underline">
            Unduh template
          </a>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputFile}
            type="file"
            accept=".xlsx"
            onChange={(e) => pilihFile(e.target.files?.[0])}
            aria-label="File Excel"
            className="block text-sm text-[#111827] file:mr-3 file:h-10 file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-sm file:font-semibold file:text-[#111827]"
          />
          {memuat && <span className="text-sm text-[#6B7280]">Memeriksa…</span>}
        </div>

        {analisis && (
          <p className="mt-4 rounded-xl border border-[#E8EAEE] bg-[#F8FAFC] p-3 text-sm text-[#4B5563]">
            Impor hanya memperbarui MK dan kelas yang ada pada file. Master MK lain tidak dihapus.
          </p>
        )}

        {galat && (
          <p role="alert" className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
            {galat}
          </p>
        )}
        {selesai && (
          <p role="status" className="mt-3 rounded-lg bg-[#DCFCE7] px-3 py-2 text-sm text-[#16A34A]">
            {selesai}
          </p>
        )}

        {r && analisis && (
          <>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <li className="rounded-full bg-[#DCFCE7] px-3 py-1 text-[#16A34A]">{r.mkBaru} MK baru</li>
              <li className="rounded-full bg-[#FFEDD5] px-3 py-1 text-[#EA580C]">{r.mkDiperbarui} MK diperbarui</li>
              <li className="rounded-full bg-[#DCE7FB] px-3 py-1 text-[#2F6BE8]">{r.kelasBaru} kelas baru</li>
              <li className="rounded-full bg-[#FFEDD5] px-3 py-1 text-[#EA580C]">{r.kelasGantiPengampu} pengampu diganti</li>
              <li className="rounded-full bg-[#FEE2E2] px-3 py-1 text-[#DC2626]">{r.galat} baris galat</li>
            </ul>

            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[#E8EAEE]">
              <table className="w-full min-w-220 text-left text-xs">
                <thead className="sticky top-0 bg-[#F8FAFC] text-[#6B7280]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Baris</th>
                    <th className="px-3 py-2 font-semibold">Dosen</th>
                    <th className="px-3 py-2 font-semibold">Kode</th>
                    <th className="px-3 py-2 font-semibold">Mata Kuliah</th>
                    <th className="px-3 py-2 font-semibold">SKS</th>
                    <th className="px-3 py-2 font-semibold">Kelas</th>
                    <th className="px-3 py-2 font-semibold">Pemetaan CPL</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.baris.map((b) => (
                    <tr key={b.baris} className="border-t border-[#F1F3F5] align-top">
                      <td className="px-3 py-2 text-[#6B7280]">{b.baris}</td>
                      <td className="px-3 py-2">{b.dosenNama ?? <span className="text-[#DC2626]">{b.dosenTeks || "–"}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2">{b.kode}</td>
                      <td className="px-3 py-2">{b.nama}</td>
                      <td className="px-3 py-2">{b.sks ?? "–"}</td>
                      <td className="px-3 py-2">{b.kelas.join(", ")}</td>
                      <td className="px-3 py-2">{b.cpl.join(", ") || "–"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${BADGE[b.status].cls}`}>
                          {BADGE[b.status].label}
                        </span>
                        {b.pesan.map((p) => (
                          <span key={p} className="mt-1 block text-[#6B7280]">
                            {p}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {r && r.galat > 0 && (
            <span className="mr-auto text-xs text-[#6B7280]">Baris galat tidak ikut diimpor; perbaiki di Excel lalu unggah ulang.</span>
          )}
          <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] px-6 text-sm font-semibold text-[#111827]">
            {selesai ? "Tutup" : "Batal"}
          </button>
          {r && (
            <button
              type="button"
              onClick={terapkan}
              disabled={menerapkan || memuat || r.valid === 0}
              className="h-11 rounded-[10px] bg-[#2F6BE8] px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {menerapkan ? "Mengimpor…" : `Impor ${r.valid} baris`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
