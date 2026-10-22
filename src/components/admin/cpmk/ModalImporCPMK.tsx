"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analisisImporCPMK, terapkanImporCPMK } from "@/lib/actions/impor-cpmk";

type AnalisisImpor = {
  tahunAjaran: string;
  jumlahBaris: number;
  jumlahBarisValid: number;
  jumlahGalat: number;
  galat: { baris: number; pesan: string }[];
  ringkasan: {
    mataKuliah: number;
    cpmk: number;
    subCpmk: number;
    pemetaan: number;
    cpmkBaru: number;
    cpmkDiperbarui: number;
    subBaru: number;
    subDiperbarui: number;
    pemetaanBaru: number;
    pemetaanDiperbarui: number;
    tidakBerubah: number;
  };
};

export function ModalImporCPMK({ onTutup }: { onTutup: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisImpor | null>(null);
  const [error, setError] = useState("");
  const [selesai, setSelesai] = useState("");
  const [loading, mulai] = useTransition();

  async function periksaFile() {
    setError("");
    setSelesai("");
    setAnalisis(null);
    if (!file) {
      setError("Pilih file Excel yang akan diimpor.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    mulai(async () => {
      const hasil = await analisisImporCPMK(formData);
      if (!hasil.ok) {
        setError(hasil.error);
        return;
      }
      setAnalisis(hasil.analisis);
    });
  }

  async function terapkan() {
    if (!file || !analisis || analisis.jumlahGalat > 0) return;
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    mulai(async () => {
      const hasil = await terapkanImporCPMK(formData);
      if (!hasil.ok) {
        setError(hasil.error);
        return;
      }
      setSelesai(hasil.pesan);
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-impor-cpmk"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onTutup();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !loading) onTutup();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-5xl flex-col rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="judul-impor-cpmk" className="text-base font-bold text-[#111827]">
              Impor CPMK &amp; Sub-CPMK dari Excel
            </h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Unggah lembar dengan kolom Kode MK, Nama Mata Kuliah, Kode CPMK, Bobot CPMK, Deskripsi CPMK,
              Kode Sub CPMK, Bobot Sub CPMK, dan Deskripsi Sub-CPMK.
            </p>
            <a
              href="/template-impor-cpmk-subcpmk.xlsx"
              download
              className="mt-1 inline-block text-[13px] font-semibold text-[#2F6BE8] hover:underline"
            >
              Unduh template Excel
            </a>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            aria-label="Tutup"
            className="rounded-full bg-[#F1F3F5] px-3 py-1.5 text-sm text-[#4B5563] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-[#E8EAEE] bg-[#F8FAFC] p-3 text-xs text-[#4B5563]">
          Impor diproses untuk Tahun Ajaran aktif. Baris yang galat akan dilewati; hanya baris valid yang ditambahkan
          atau diperbarui.
          CPMK, Sub-CPMK, dan pemetaan yang tidak tercantum tidak dihapus. Bobot dapat ditulis sebagai persen
          (50) atau pecahan (0,5); total bobot per mata kuliah dan per CPMK maksimal 100%.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setAnalisis(null);
              setError("");
              setSelesai("");
            }}
            aria-label="Pilih file Excel CPMK dan Sub-CPMK"
            className="block min-w-0 flex-1 text-sm text-[#111827] file:mr-3 file:h-10 file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-sm file:font-semibold file:text-[#111827]"
          />
          <button
            type="button"
            onClick={periksaFile}
            disabled={loading}
            className="h-10 rounded-[10px] bg-[#2F6BE8] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Periksa file"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
            {error}
          </p>
        )}
        {selesai && (
          <p role="status" className="mt-3 rounded-lg bg-[#DCFCE7] px-3 py-2 text-sm text-[#166534]">
            {selesai}
          </p>
        )}

        {analisis && (
          <>
            <p className="mt-3 text-xs text-[#6B7280]">Target impor: T.A. {analisis.tahunAjaran}</p>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
              <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.ringkasan.mataKuliah} mata kuliah</p>
              <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.ringkasan.cpmk} CPMK</p>
              <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.ringkasan.subCpmk} Sub-CPMK</p>
              <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.ringkasan.pemetaan} pemetaan</p>
              <p className={`rounded-lg px-3 py-2 ${analisis.jumlahGalat ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#DCFCE7] text-[#166534]"}`}>
                {analisis.jumlahGalat} galat
              </p>
              <p className="rounded-lg bg-[#DCFCE7] px-3 py-2 text-[#166534]">{analisis.ringkasan.cpmkBaru} CPMK baru</p>
              <p className="rounded-lg bg-[#FFEDD5] px-3 py-2 text-[#C2410C]">{analisis.ringkasan.cpmkDiperbarui} CPMK diperbarui</p>
              <p className="rounded-lg bg-[#DCFCE7] px-3 py-2 text-[#166534]">{analisis.ringkasan.subBaru} Sub-CPMK baru</p>
              <p className="rounded-lg bg-[#FFEDD5] px-3 py-2 text-[#C2410C]">{analisis.ringkasan.subDiperbarui} Sub-CPMK diperbarui</p>
              <p className="rounded-lg bg-[#FFEDD5] px-3 py-2 text-[#C2410C]">{analisis.ringkasan.pemetaanDiperbarui} pemetaan bobot berubah</p>
            </div>
            {analisis.jumlahGalat > 0 && (
              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[#E8EAEE]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#F8FAFC] text-[#6B7280]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Baris</th>
                      <th className="px-3 py-2 font-semibold">Masalah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisis.galat.map((item, index) => (
                      <tr key={`${item.baris}-${index}`} className="border-t border-[#F1F3F5] align-top">
                        <td className="whitespace-nowrap px-3 py-2">{item.baris}</td>
                        <td className="px-3 py-2 text-[#B91C1C]">{item.pesan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {analisis.jumlahGalat > analisis.galat.length && (
                  <p className="border-t border-[#F1F3F5] px-3 py-2 text-xs text-[#6B7280]">
                    Menampilkan {analisis.galat.length} dari {analisis.jumlahGalat} galat.
                  </p>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-[#6B7280]">
              {analisis.jumlahBarisValid} dari {analisis.jumlahBaris} baris akan diimpor. Baris bergalat tidak dieksekusi;
              pemetaan tersimpan yang tidak dicantumkan tetap dipertahankan.
            </p>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            className="h-11 rounded-[10px] bg-[#EEF3FD] px-6 text-sm font-semibold text-[#111827] disabled:opacity-50"
          >
            {selesai ? "Selesai" : "Batal"}
          </button>
          {analisis && !selesai && (
            <button
              type="button"
              onClick={terapkan}
              disabled={loading || analisis.jumlahBarisValid === 0}
              className="h-11 rounded-[10px] bg-[#2F6BE8] px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Mengimpor…" : "Terapkan impor"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
