import type { ReactNode } from "react";

export const KARTU =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_4px_12px_rgba(15,23,42,.04)]";

export function ChartCard({
  judul,
  subjudul,
  aksi,
  className = "",
  children,
}: {
  judul: string;
  subjudul?: string;
  aksi?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${KARTU} flex flex-col p-5 ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-tight text-[#0F172A]">{judul}</h2>
          {subjudul && <p className="mt-0.5 text-[12px] text-[#64748B]">{subjudul}</p>}
        </div>
        {aksi}
      </header>
      {children}
    </section>
  );
}
