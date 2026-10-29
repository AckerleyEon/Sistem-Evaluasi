import type { ReactNode } from "react";

export const KARTU =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_4px_12px_rgba(15,23,42,.04)]";

export const FOKUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60A5FA]";

export function KartuJudul({
  judul,
  subjudul,
  aksi,
}: {
  judul: string;
  subjudul?: string;
  aksi?: ReactNode;
}) {
  return (
    <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-tight text-[#0F172A]">{judul}</h2>
        {subjudul && <p className="mt-0.5 text-[12px] text-[#64748B]">{subjudul}</p>}
      </div>
      {aksi}
    </header>
  );
}
