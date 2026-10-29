"use client";

import { useEffect } from "react";
import { Ikon } from "../Ikon";

export interface IsiToast {
  nada: "ok" | "galat";
  judul: string;
  deskripsi?: string;
  kode?: string;
}

/** Pemberitahuan singkat di pojok kanan bawah; hilang sendiri setelah beberapa detik (galat bertahan lebih lama). */
export function ToastAksi({ isi, onTutup }: { isi: IsiToast; onTutup: () => void }) {
  const ok = isi.nada === "ok";

  useEffect(() => {
    const id = window.setTimeout(onTutup, ok ? 6000 : 10000);
    return () => window.clearTimeout(id);
  }, [isi, ok, onTutup]);

  return (
    <div
      role={ok ? "status" : "alert"}
      className="fixed inset-x-3 bottom-4 z-50 flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_12px_32px_rgba(15,23,42,.18)] sm:inset-x-auto sm:right-5 sm:w-[380px]"
    >
      <Ikon nama={ok ? "centang" : "info"} ukuran={18} className={`mt-0.5 shrink-0 ${ok ? "text-[#16A34A]" : "text-[#DC2626]"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-[#0F172A]">{isi.judul}</p>
        {isi.deskripsi && <p className="mt-0.5 break-words text-[11px] leading-snug text-[#334155]">{isi.deskripsi}</p>}
      </div>
      {isi.kode && <span className="rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">{isi.kode}</span>}
      <button
        type="button"
        onClick={onTutup}
        aria-label="Tutup pemberitahuan"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#64748B] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#60A5FA]"
      >
        <Ikon nama="tutup" ukuran={14} />
      </button>
    </div>
  );
}
