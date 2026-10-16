"use client";

import { useState, useTransition } from "react";
import { kirimPengingatDosen } from "@/lib/actions/dashboard";
import { Ikon } from "./Ikon";

export function TombolPengingat({ tahunAjaranId }: { tahunAjaranId: string }) {
  const [pending, mulai] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  function klik() {
    if (!window.confirm("Kirim pengingat input nilai ke dosen yang belum menyelesaikan?")) return;
    mulai(async () => {
      const hasil = await kirimPengingatDosen(tahunAjaranId);
      setPesan(hasil.pesan);
      window.setTimeout(() => setPesan(null), 5000);
    });
  }

  return (
    <div className="mt-3 border-t border-[#E5E7EB] pt-3">
      <button
        type="button"
        onClick={klik}
        disabled={pending}
        className="flex min-h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 py-2 text-[12px] font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60A5FA]"
      >
        <Ikon nama="send" ukuran={14} />
        {pending ? "Memproses..." : "Kirim Notifikasi Pengingat ke Dosen"}
      </button>
      {pesan && (
        <p role="status" className="mt-2 text-center text-[11px] text-[#334155]">
          {pesan}
        </p>
      )}
    </div>
  );
}
