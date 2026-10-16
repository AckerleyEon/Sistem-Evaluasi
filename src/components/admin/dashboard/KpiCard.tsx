import Link from "next/link";
import { KARTU } from "./ChartCard";

export function KpiCard({
  label,
  angka,
  satuan,
  badge,
  nadaBadge = "hijau",
  href,
  sorot = false,
  warnaAngka = "text-[#0F172A]",
}: {
  label: string;
  angka: number | string;
  satuan: string;
  badge?: string;
  nadaBadge?: "hijau" | "biru";
  href: string;
  sorot?: boolean;
  warnaAngka?: string;
}) {
  const badgeCls = sorot
    ? "bg-white/20 text-white"
    : nadaBadge === "biru"
      ? "bg-[#DBEAFE] text-[#1D4ED8]"
      : "bg-[#DCFCE7] text-[#16A34A]";

  return (
    <Link
      href={href}
      className={`${
        sorot ? "bg-[#2563EB] text-white shadow-[0_6px_14px_rgba(37,99,235,.30)]" : `${KARTU} text-[#0F172A]`
      } flex min-h-[92px] flex-col justify-between rounded-2xl p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60A5FA]`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[12px] font-medium leading-tight ${sorot ? "text-white/90" : "text-[#64748B]"}`}>
          {label}
        </span>
        {badge && (
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${badgeCls}`}>{badge}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[28px] font-bold leading-none ${sorot ? "text-white" : warnaAngka}`}>{angka}</span>
        <span className={`text-[12px] ${sorot ? "text-white/90" : "text-[#64748B]"}`}>{satuan}</span>
      </div>
    </Link>
  );
}
