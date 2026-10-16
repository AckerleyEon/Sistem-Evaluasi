"use client";

import { useState, useTransition } from "react";
import { simpanPassingGrade } from "@/lib/actions/dashboard";
import { Ikon } from "./Ikon";

function persenLulus(histogram: number[], batas: number) {
  const total = histogram.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const lulus = histogram.slice(batas).reduce((a, b) => a + b, 0);
  return Math.round((lulus / total) * 100);
}

export function BatasBawahCPL({ passingGrade, histogram }: { passingGrade: number; histogram: number[] }) {
  const [nilai, setNilai] = useState(passingGrade);
  const [pending, mulai] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  const diubah = nilai !== passingGrade;
  const lulusBaru = persenLulus(histogram, nilai);
  const lulusLama = persenLulus(histogram, passingGrade);
  const terisi = ((nilai - 50) / 50) * 100;

  function atur(v: number) {
    if (Number.isNaN(v)) return;
    setNilai(Math.min(100, Math.max(50, Math.round(v))));
  }

  function terapkan() {
    if (!diubah) return;
    if (!window.confirm(`Terapkan batas bawah ${nilai}% ke seluruh sistem?`)) return;
    mulai(async () => {
      const hasil = await simpanPassingGrade(nilai);
      setPesan(hasil.pesan);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-[#2563EB] p-5 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] lg:col-span-5">
      <header className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/20">
          <Ikon nama="slider" ukuran={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-bold leading-tight">Batas Bawah Nilai CPL</h2>
          <p className="text-[11px] text-white/80">Ambang kelulusan CPL &amp; CPMK</p>
        </div>
        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">Aktif</span>
        <Ikon nama="centang" ukuran={20} />
      </header>

      <div className="rounded-xl bg-white p-3 text-[#0F172A]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#64748B]">Passing Grade Berlaku</p>
            <p className="text-[24px] font-bold leading-tight text-[#1D4ED8]">
              {passingGrade} <span className="text-[16px]">%</span>
            </p>
          </div>
          <label className="flex items-center gap-1 rounded-lg bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-semibold">
            <span className="sr-only">Ambang baru</span>
            <input
              type="number"
              min={50}
              max={100}
              value={nilai}
              onChange={(e) => atur(e.target.valueAsNumber)}
              className="w-10 bg-transparent text-right outline-none"
            />
            <span className="text-[#64748B]">%</span>
          </label>
        </div>
        {diubah && (
          <p className="mt-2 text-[11px] text-[#334155]">
            Pratinjau kelulusan: <b>{lulusBaru === null ? "-" : `${lulusBaru}%`}</b>
            {lulusLama !== null && lulusBaru !== null && <> (sebelumnya {lulusLama}%)</>}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span>Min: 50%</span>
          <span className="font-semibold">Geser Ambang CPL</span>
          <span>Maks: 100%</span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          step={1}
          value={nilai}
          onChange={(e) => atur(e.target.valueAsNumber)}
          aria-label="Geser ambang CPL"
          className="h-2 w-full cursor-pointer appearance-none rounded-full accent-white"
          style={{
            background: `linear-gradient(to right, #fff ${terisi}%, rgba(255,255,255,.3) ${terisi}%)`,
          }}
        />
      </div>

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-white/20 pt-3">
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {pesan ?? "Otomatis ke seluruh sistem"}
        </span>
        <button
          type="button"
          onClick={terapkan}
          disabled={!diubah || pending}
          className="flex min-h-[32px] items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-[#1D4ED8] transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Ikon nama="simpan" ukuran={14} />
          {pending ? "Menyimpan..." : "Terapkan"}
        </button>
      </footer>
    </section>
  );
}
