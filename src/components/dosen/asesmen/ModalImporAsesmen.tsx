"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imporAsesmenExcel } from "@/lib/actions/impor-asesmen";
import { Ikon } from "../Ikon";
import { FOKUS } from "./KartuUI";

export function ModalImporAsesmen({
  mataKuliahId,
  namaMK,
  onTutup,
  onSelesai,
}: {
  mataKuliahId: string;
  namaMK: string;
  onTutup: () => void;
  onSelesai: (pesan: string) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sedangImpor, setSedangImpor] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const ukuranTotal = files.reduce((total, file) => total + file.size, 0);
  const batasUkuran = files.length > 20 || ukuranTotal > 20 * 1024 * 1024 || files.some((file) => file.size > 5 * 1024 * 1024);

  useEffect(() => {
    const elemen = dialog.current;
    if (!elemen) return;
    if (!elemen.open) elemen.showModal();
    return () => {
      if (elemen.open) elemen.close();
    };
  }, []);

  function tutup() {
    if (sedangImpor) return;
    dialog.current?.close();
    onTutup();
  }

  async function impor() {
    const fileTerpilih = Array.from(inputRef.current?.files ?? []);
    if (fileTerpilih.length === 0) {
      setGalat("Pilih minimal satu file Excel (.xlsx) yang sudah diisi terlebih dahulu.");
      return;
    }
    if (!window.confirm(`Impor ${fileTerpilih.length} file akan menambahkan tugas baru dan menyesuaikan bobot pada tiap kelas. Lanjutkan?`)) return;
    setSedangImpor(true);
    setGalat(null);
    const formData = new FormData();
    for (const file of fileTerpilih) formData.append("files", file);
    try {
      const hasil = await imporAsesmenExcel(formData);
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
            Pilih beberapa file sekaligus. Setiap file dapat ditujukan untuk mata kuliah dan kelas berbeda.
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
          Unduh Template {namaMK}
        </a>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-[#334155]">File Excel (.xlsx)</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            multiple
            disabled={sedangImpor}
            onChange={(e) => {
              setFiles(Array.from(e.currentTarget.files ?? []));
              setGalat(null);
            }}
            className="block w-full text-[12px] file:mr-3 file:min-h-[36px] file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-[12px] file:font-semibold file:text-[#111827]"
          />
        </label>
        {files.length > 0 && (
          <section aria-label="Ringkasan file yang dipilih" className="max-h-32 overflow-y-auto rounded-lg border border-[#E5E7EB]">
            <div className="sticky top-0 flex justify-between bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#475569]">
              <span>{files.length} file dipilih</span>
              <span>{(files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <ul className="divide-y divide-[#E5E7EB]">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px]">
                  <span className="min-w-0 truncate text-[#334155]" title={file.name}>{file.name}</span>
                  <span className="shrink-0 text-[#64748B]">{(file.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="space-y-1.5 rounded-lg bg-[#F8FAFC] p-3 text-[11px] text-[#475569]">
          <p>Nama file: <b>KODEMK_NAMAMK_asesmen.xlsx</b></p>
          <p>Kolom Excel:</p>
          <div className="overflow-x-auto rounded border border-[#E2E8F0] bg-white">
            <table className="min-w-full text-left">
              <thead className="bg-[#EFF6FF] text-[#1E40AF]">
                <tr>
                  {["Kelas", "Nama Tugas", "Pertemuan", "Bobot", "Kode Sub-CPMK"].map((kolom) => (
                    <th key={kolom} className="whitespace-nowrap px-2 py-1 font-semibold">{kolom}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {["A", "Kuis 1", "3", "20", "SUB-ELKA-1"].map((nilai) => (
                    <td key={nilai} className="whitespace-nowrap px-2 py-1">{nilai}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p>Setiap baris harus berisi kelas. Nama kelas harus sesuai daftar di template.</p>
        </div>
        {batasUkuran && (
          <p role="alert" className="rounded-lg bg-[#FFF7ED] px-3 py-2 text-[11px] text-[#C2410C]">
            Batas impor: maksimal 20 file, 5 MB per file, dan 20 MB total.
          </p>
        )}
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
          disabled={sedangImpor || batasUkuran}
          className={`flex min-h-[34px] items-center gap-1.5 rounded-full bg-[#2563EB] px-4 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] hover:bg-[#1D4ED8] disabled:opacity-60 ${FOKUS}`}
        >
          <Ikon nama="unggah" ukuran={14} />
          {sedangImpor ? "Mengimpor..." : `Impor ${files.length || ""} File`}
        </button>
      </footer>
    </dialog>
  );
}
