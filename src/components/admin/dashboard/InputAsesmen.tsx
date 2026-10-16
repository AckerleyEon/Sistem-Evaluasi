import type { BarAsesmen } from "./tipe";
import { ChartCard } from "./ChartCard";

export function InputAsesmen({
  data,
  labelBulan,
  puncak,
}: {
  data: BarAsesmen[];
  labelBulan: string;
  puncak: { nama: string; pertemuanKe: number } | null;
}) {
  const maks = Math.max(...data.map((d) => d.jumlah), 1);

  return (
    <ChartCard
      judul="Input Asesmen"
      subjudul="Progres Bulanan"
      aksi={
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
          {labelBulan}
        </span>
      }
      className="lg:col-span-3"
    >
      <div
        className="flex h-[120px] items-end justify-between gap-2 px-1"
        role="img"
        aria-label={`Jumlah nilai yang diinput per bulan. ${data.map((d) => `${d.label}: ${d.jumlah}`).join(", ")}`}
      >
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className={`text-[11px] ${d.aktif ? "font-bold text-[#1D4ED8]" : "font-semibold text-[#64748B]"}`}>
              {d.jumlah}
            </span>
            <div
              className={`w-full max-w-[24px] rounded-t-md ${d.aktif ? "bg-[#2563EB]" : "bg-[#DBEAFE]"}`}
              style={{ height: `${Math.max((d.jumlah / maks) * 84, d.jumlah ? 4 : 2)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-2 px-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[11px] text-[#64748B]">
            {d.label}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <p className="text-[11px] text-[#64748B]">Puncak Input Nilai</p>
        <p className="text-[12px] font-bold text-[#0F172A]">
          {puncak ? `${puncak.nama} · Pertemuan ke-${puncak.pertemuanKe}` : "Belum ada data"}
        </p>
      </div>
    </ChartCard>
  );
}
