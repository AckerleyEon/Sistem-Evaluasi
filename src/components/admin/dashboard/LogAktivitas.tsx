"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EntriLog } from "./tipe";
import { KARTU } from "./ChartCard";
import { Ikon, type NamaIkon } from "./Ikon";

const TAB = [
  { kunci: "semua", label: "Semua" },
  { kunci: "nilai", label: "Nilai" },
  { kunci: "rps", label: "RPS" },
] as const;

const CHIP = {
  biru: "bg-[#EFF6FF] text-[#1D4ED8]",
  hijau: "bg-[#DCFCE7] text-[#16A34A]",
  oranye: "bg-[#FFEDD5] text-[#EA580C]",
} as const;
const IKON_CHIP: Record<keyof typeof CHIP, NamaIkon> = { biru: "hierarki", hijau: "ceklis", oranye: "dokumen" };

export function LogAktivitas({ entri }: { entri: EntriLog[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TAB)[number]["kunci"]>("semua");

  // "Real-time": muat ulang data server tiap 60 detik
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [router]);

  const tampil = entri.filter((e) => tab === "semua" || e.jenis === tab);

  return (
    <section className={`${KARTU} p-5 lg:col-span-8 lg:col-start-5`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Log Aktivitas Dosen &amp; Nilai</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
            Real-time
          </span>
        </div>
        <div role="tablist" className="flex rounded-lg bg-[#F1F5F9] p-0.5">
          {TAB.map((t) => (
            <button
              key={t.kunci}
              role="tab"
              aria-selected={tab === t.kunci}
              onClick={() => setTab(t.kunci)}
              className={`min-h-[28px] rounded-md px-3 text-[11px] font-semibold transition ${
                tab === t.kunci ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tampil.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#64748B]">Belum ada aktivitas.</p>
      ) : (
        <ul className="divide-y divide-[#F1F5F9]">
          {tampil.slice(0, 4).map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-[11px] font-bold text-[#1D4ED8]">
                {e.inisial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-[#0F172A]" title={e.dosen}>
                  {e.dosen}
                </p>
                <p className="text-[11px] leading-snug text-[#334155]">
                  {e.teks} <span className="font-medium text-[#2563EB]">{e.sorot}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] text-[#64748B]">{e.waktu}</span>
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${CHIP[e.chip.nada]}`}
                >
                  <Ikon nama={IKON_CHIP[e.chip.nada]} ukuran={12} />
                  {e.chip.teks}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/admin/laporan"
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] hover:underline"
      >
        Lihat Semua Riwayat Aktivitas Audit
        <Ikon nama="panah" ukuran={14} />
      </Link>
    </section>
  );
}
