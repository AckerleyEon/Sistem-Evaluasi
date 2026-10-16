import type { SegmenPredikat } from "./tipe";
import { ChartCard } from "./ChartCard";
import { Ikon } from "./Ikon";

const R = 52;
const KELILING = 2 * Math.PI * R;
const CELAH = 2;

export function DonutPredikat({
  segmen,
  total,
  persenLulus,
  jumlahRemedial,
}: {
  segmen: SegmenPredikat[];
  total: number;
  persenLulus: number | null;
  jumlahRemedial: number;
}) {
  let offset = 0;
  const busur = segmen.map((s) => {
    const panjang = total ? (s.jumlah / total) * KELILING : 0;
    const el = { ...s, panjang, offset };
    offset += panjang;
    return el;
  });
  const remedial = segmen.find((s) => s.kunci === "DE");
  const lainnya = segmen.filter((s) => s.kunci !== "DE");

  return (
    <ChartCard
      judul="Distribusi Nilai CPL"
      subjudul="Sebaran Predikat Asesmen"
      aksi={<Ikon nama="pie" ukuran={20} className="text-[#2563EB]" />}
      className="lg:col-span-4"
    >
      <div className="relative mx-auto my-1 h-[150px] w-[150px]">
        <svg
          viewBox="0 0 130 130"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Distribusi predikat dari ${total} nilai. ${segmen.map((s) => `${s.label}: ${s.persen}%`).join(", ")}`}
        >
          <circle cx="65" cy="65" r={R} fill="none" stroke="#EEF2F7" strokeWidth="18" />
          {busur
            .filter((b) => b.panjang > 0)
            .map((b) => (
              <circle
                key={b.kunci}
                cx="65"
                cy="65"
                r={R}
                fill="none"
                stroke={b.warna}
                strokeWidth="18"
                strokeDasharray={`${Math.max(b.panjang - CELAH, 0.5)} ${KELILING}`}
                strokeDashoffset={-b.offset}
              >
                <title>{`${b.label}: ${b.persen}% (${b.jumlah} nilai)`}</title>
              </circle>
            ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[11px] text-[#64748B]">Total Sampel</span>
          <span className="text-[24px] font-bold leading-tight text-[#0F172A]">{total}</span>
          <span className="text-[10px] text-[#64748B]">Nilai Tugas/UTS</span>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-semibold text-[#334155]">
        {lainnya.map((s) => (
          <li key={s.kunci} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.warna }} />
            {s.label}: {s.persen}%
          </li>
        ))}
        {remedial && (
          <li className="col-span-2 flex items-center gap-1.5 text-[#DC2626]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: remedial.warna }} />
            {remedial.label}: {remedial.persen}% ({jumlahRemedial} nilai)
          </li>
        )}
      </ul>

      <p className="mt-auto border-t border-[#E5E7EB] pt-3 text-center text-[11px] font-semibold text-[#16A34A]">
        {persenLulus === null
          ? "Belum ada nilai untuk dihitung"
          : `Tingkat Kelulusan: ${persenLulus}% Melampaui Batas Bawah`}
      </p>
    </ChartCard>
  );
}
