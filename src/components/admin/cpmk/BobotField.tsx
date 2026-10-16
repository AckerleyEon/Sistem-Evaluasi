"use client";

export function bobotValid(nilai: string, terisiLain: number, batas: number) {
  const n = Number(nilai);
  return nilai !== "" && Number.isInteger(n) && n >= 1 && n <= batas - terisiLain;
}

export function BobotField({
  label,
  nilai,
  onChange,
  terisiLain,
  batas,
}: {
  label: string;
  nilai: string;
  onChange: (v: string) => void;
  terisiLain: number;
  batas: number;
}) {
  const angka = Number(nilai);
  const ada = nilai !== "" && Number.isInteger(angka) && angka >= 1;
  const sisa = Math.max(0, batas - terisiLain);
  const melebihi = ada && angka > sisa;
  const total = terisiLain + (ada ? angka : 0);
  const persen = batas > 0 ? Math.min(100, (total / batas) * 100) : 0;

  return (
    <div className="rounded-[10px] bg-[#EEF3FD] p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="bobot-input" className="text-[13px] font-medium text-[#111827]">
          {label}
        </label>
        <div className={`flex items-center gap-1 rounded-lg bg-white px-3 py-1 ${melebihi ? "ring-2 ring-[#DC2626]" : ""}`}>
          <input
            id="bobot-input"
            type="number"
            min={1}
            max={batas}
            inputMode="numeric"
            value={nilai}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 bg-transparent text-right text-sm font-bold text-[#2F6BE8] outline-none"
          />
          <span className="text-sm font-bold text-[#2F6BE8]">%</span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={batas}
        aria-valuenow={Math.min(total, batas)}
        aria-label={`${label}: terisi ${total} dari ${batas} persen`}
        className="mt-3 h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className={`h-full rounded-full transition-[width] ${melebihi ? "bg-[#DC2626]" : "bg-[#2F6BE8]"}`}
          style={{ width: `${persen}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        {melebihi ? (
          <span className="font-medium text-[#DC2626]">Melebihi sisa kuota ({sisa}%)</span>
        ) : (
          <span className="font-medium text-[#15803D]">Sisa kuota bobot tersedia: {sisa}%</span>
        )}
        <span className="text-[#4B5563]">
          Terisi {terisiLain}% + {ada ? angka : 0}% = {total}%
        </span>
      </div>
    </div>
  );
}