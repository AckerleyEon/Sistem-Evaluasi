"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imporAsesmenExcel } from "@/lib/actions/impor-asesmen";
import { Ikon } from "../Ikon";
import { FOKUS } from "./KartuUI";

export function ModalImporAsesmen({
  mataKuliahId,
  kelasId,
  namaMK,
  onTutup,
  onSelesai,
}: {
  mataKuliahId: string;
  kelasId: string | null;
  namaMK: string;
  onTutup: () => void;
  onSelesai: (pesan: string) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [namaFile, setNamaFile] = useState("");
  const [sedangImpor, setSedangImpor] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function tutup() {
    if (sedangImpor) return;
    dialog.current?.close();
    onTutup();
  }

  async function impor() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setGalat("Pilih file Excel (.xlsx) yang sudah diisi terlebih dahulu.");
      return;
    }
    if (!window.confirm("Impor akan menambahkan tugas baru dan menyesuaikan bobot tugas yang sudah ada. Lanjutkan?")) return;
    setSedangImpor(true);
    setGalat(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const hasil = await imporAsesmenExcel(mataKuliahId, kelasId, formData);
      if (!hasil.ok) {
        setGalat(hasil.pesan);
        return;
      }
      dialog.current?.close();
      onSelesai(hasil.pesan);
      router.refresh();
    } catch (error) {
      setGalat(error instanceof Error ? error.message : "Impor asesmen gagal.");
    } finally {
      setSedangImpor(false);
    }
  }

  const query = new URLSearchParams({ mataKuliahId });
  if (kelasId) query.set("kelasId", kelasId);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="judul-impor-asesmen"
      onCancel={(e) => {
        e.preventDefault();
        tutup();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) tutup();
      }}
      className="m-auto max-h-[90vh] w-[520px] max-w-[92vw] flex-col overflow-hidden rounded-[20px] bg-white p-0 text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,.25)] backdrop:bg-[rgba(15,23,42,.45)] open:flex max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
    >
      <header className="flex items-start gap-3 border-b border-[#E5E7EB] px-5 pb-3 pt-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2563EB] text-white">
          <Ikon nama="tabel" ukuran={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="judul-impor-asesmen" className="text-[15px] font-bold">
            Import Asesmen MK (.xlsx)
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            {namaMK}. Isi tugas, bobot, dan pemetaan Sub-CPMK di Excel, lalu impor kembali.
          </p>
        </div>
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup"
          className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-[#F1F5F9] ${FOKUS}`}
        >
          <Ikon nama="tutup" ukuran={16} />
        </button>
      </header>

      <div className="space-y-3 px-5 py-4">
        <a
          href={`/api/dosen/asesmen/template?${query.toString()}`}
          className={`flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 text-[12px] font-bold text-[#1D4ED8] hover:bg-[#DBEAFE] ${FOKUS}`}
        >
          <Ikon nama="unduh" ukuran={14} />
          Unduh Template Excel
        </a>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-[#334155]">File Excel yang sudah diisi</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            disabled={sedangImpor}
            onChange={(e) => {
              setNamaFile(e.currentTarget.files?.[0]?.name ?? "");
              setGalat(null);
            }}
            className="block w-full text-[12px] file:mr-3 file:min-h-[36px] file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-[12px] file:font-semibold file:text-[#111827]"
          />
        </label>
        {namaFile && <p className="truncate text-[11px] text-[#64748B]">Dipilih: {namaFile}</p>}
        <p className="text-[11px] text-[#64748B]">
          Impor menambahkan tugas baru dan menyesuaikan bobot tugas yang sudah ada secara proporsional.
        </p>
        {galat && (
          <p role="alert" className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#DC2626]">
            {galat}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] px-5 py-3">
        <button
          type="button"
          onClick={tutup}
          disabled={sedangImpor}
          className={`min-h-[34px] min-w-[100px] rounded-full border border-[#E5E7EB] px-4 text-[12px] font-semibold hover:bg-[#F8FAFC] disabled:opacity-50 ${FOKUS}`}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={impor}
          disabled={sedangImpor}
          className={`flex min-h-[34px] items-center gap-1.5 rounded-full bg-[#2563EB] px-4 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] hover:bg-[#1D4ED8] disabled:opacity-60 ${FOKUS}`}
        >
          <Ikon nama="unggah" ukuran={14} />
          {sedangImpor ? "Mengimpor..." : "Impor Sekarang"}
        </button>
      </footer>
    </dialog>
  );
}
