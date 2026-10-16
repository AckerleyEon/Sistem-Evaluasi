import { Ikon, type NamaIkon } from "../Ikon";
import { KARTU } from "./KartuUI";
import type { CpmkOpsi, TugasRow } from "./tipe";

function Tile({ ikon, sorot }: { ikon: NamaIkon; sorot?: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-lg ${
        sorot ? "bg-white text-[#2563EB]" : "bg-[#EFF6FF] text-[#2563EB]"
      }`}
    >
      <Ikon nama={ikon} ukuran={15} />
    </span>
  );
}

export function KpiAsesmen({
  tugas,
  cpmk,
  mahasiswa,
  labelTA,
}: {
  tugas: TugasRow[];
  cpmk: CpmkOpsi[];
  mahasiswa: number;
  labelTA: string;
}) {
  const totalBobot = Math.round(tugas.reduce((s, t) => s + t.bobot, 0) * 10) / 10;
  const selisih = Math.round((100 - totalBobot) * 10) / 10;
  const bobotNada =
    tugas.length === 0
      ? { warna: "text-[#64748B]", badge: "Belum ada tugas", badgeCls: "text-[#64748B]" }
      : selisih === 0
        ? { warna: "text-[#16A34A]", badge: "✓ Lengkap", badgeCls: "text-[#16A34A]" }
        : selisih > 0
          ? { warna: "text-[#EA580C]", badge: `Kurang ${selisih}%`, badgeCls: "text-[#EA580C]" }
          : { warna: "text-[#DC2626]", badge: `Lebih ${Math.abs(selisih)}%`, badgeCls: "text-[#DC2626]" };

  const terpetakan = new Set(tugas.flatMap((t) => t.cpmkIds));
  const tercover = cpmk.filter((c) => terpetakan.has(c.id));
  const belum = cpmk.filter((c) => !terpetakan.has(c.id));
  const persenCover = cpmk.length ? Math.round((tercover.length / cpmk.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className={`${KARTU} flex min-h-[96px] flex-col justify-between p-4`}>
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Total Tugas</span>
          <Tile ikon="clipboard" />
        </div>
        <div className="flex items-end justify-between">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold leading-none">{tugas.length}</span>
            <span className="text-[12px] text-[#64748B]">Instrumen</span>
          </p>
          <span className="rounded-md bg-[#DBEAFE] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
            RPS {labelTA.slice(0, 4)}
          </span>
        </div>
      </div>

      <div className={`${KARTU} flex min-h-[96px] flex-col justify-between p-4`}>
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Bobot Terdistribusi</span>
          <Tile ikon="pie" />
        </div>
        <div className="flex items-end justify-between">
          <span className={`text-[28px] font-bold leading-none ${bobotNada.warna}`}>{totalBobot}%</span>
          <span className={`text-[11px] font-semibold ${bobotNada.badgeCls}`}>{bobotNada.badge}</span>
        </div>
      </div>

      <div className="flex min-h-[96px] flex-col justify-between rounded-2xl bg-[#2563EB] p-4 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)]">
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-white/90">Pemetaan CPMK</span>
          <Tile ikon="target" sorot />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold leading-none">
              {tercover.length}/{cpmk.length}
            </span>
            <span className="text-[12px] text-white/90">CPMK</span>
          </p>
          <span
            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#2563EB]"
            title={belum.length ? `Belum tercover: ${belum.map((c) => c.kode).join(", ")}` : undefined}
          >
            {belum.length === 0
              ? `${persenCover}% Tercover`
              : `Belum: CPMK ${belum.map((c) => c.angka).join(", ")}`}
          </span>
        </div>
      </div>

      <div className={`${KARTU} flex min-h-[96px] flex-col justify-between p-4`}>
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Mahasiswa Terdaftar</span>
          <Tile ikon="users" />
        </div>
        <div className="flex items-end justify-between">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold leading-none">{mahasiswa}</span>
            <span className="text-[12px] text-[#64748B]">Mahasiswa</span>
          </p>
          <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">Total</span>
        </div>
      </div>
    </div>
  );
}
