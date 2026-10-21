"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imporAsesmenExcel } from "@/lib/actions/impor-asesmen";
import { Ikon } from "../Ikon";
import { KARTU } from "./KartuUI";

// Panduan dan template belum punya berkas sumber di project, jadi tautan/tombolnya sengaja nonaktif.
export function KartuPanduan() {
  return (
    <section className={`${KARTU} flex gap-4 p-5 lg:col-span-8`}>
      <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[#EFF6FF] text-[#2563EB] sm:grid">
        <Ikon nama="lencana" ukuran={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[14px] font-bold">Panduan Standar Penilaian Berbasis OBE</h2>
          <span className="shrink-0 rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
            Tervalidasi
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#334155]">
          Unduh panduan untuk memahami tata cara pembuatan format matriks asesmen dengan pemetaan CPMK yang konsisten.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <span className="font-bold text-[#2563EB] opacity-60" title="Berkas panduan belum tersedia">
            Unduh Panduan ↓
          </span>
          <span className="font-semibold text-[#334155] opacity-60" title="Halaman belum tersedia">
            Lihat Pemetaan CPL Prodi ↗
          </span>
        </div>
      </div>
    </section>
  );
}

export function KartuUnduh({ mataKuliahId, kelasId, readOnly = false }: { mataKuliahId: string; kelasId: string | null; readOnly?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sedangImpor, setSedangImpor] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);

  async function prosesFile(file: File | undefined) {
    if (!file) return;
    if (!window.confirm("Impor akan menambahkan tugas baru dan menyesuaikan bobot tugas yang sudah ada. Lanjutkan?")) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSedangImpor(true);
    setPesan(null);
    setBerhasil(false);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const hasil = await imporAsesmenExcel(mataKuliahId, kelasId, formData);
      setPesan(hasil.pesan);
      setBerhasil(hasil.ok);
      if (hasil.ok) router.refresh();
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Impor asesmen gagal.");
    } finally {
      setSedangImpor(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const query = new URLSearchParams({ mataKuliahId });
  if (kelasId) query.set("kelasId", kelasId);

  return (
    <section className="flex flex-col justify-between gap-3 rounded-2xl bg-[#2563EB] p-5 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] lg:col-span-4">
      <div>
        <h2 className="text-[14px] font-bold">Unduh Matriks Asesmen</h2>
        <p className="mt-1 text-[12px] text-white/85">
          Isi tugas, bobot, dan pemetaan Sub-CPMK di Excel, lalu impor kembali.
        </p>
      </div>
      <div className="space-y-2">
        <a
          href={`/api/dosen/asesmen/template?${query.toString()}`}
          className="flex min-h-[36px] w-full items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#1D4ED8] hover:bg-blue-50"
        >
          <Ikon nama="tabel" ukuran={14} />
          Unduh Template Excel
        </a>
        {!readOnly && (
          <label className={`flex min-h-[36px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/50 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-white/10 ${sedangImpor ? "pointer-events-none opacity-60" : ""}`}>
            <Ikon nama="unggah" ukuran={14} />
            {sedangImpor ? "Mengimpor..." : "Impor Excel yang Diisi"}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              disabled={sedangImpor}
              className="sr-only"
              onChange={(event) => void prosesFile(event.currentTarget.files?.[0])}
            />
          </label>
        )}
        {pesan && (
          <p role={berhasil ? "status" : "alert"} className={`text-[11px] leading-relaxed ${berhasil ? "text-blue-100" : "text-red-100"}`}>
            {pesan}
          </p>
        )}
      </div>
    </section>
  );
}
