import { Ikon } from "../Ikon";

export interface IsiBanner {
  nada: "ok" | "galat";
  judul: string;
  deskripsi?: string;
  kode?: string;
}

export function BannerAksi({ isi, onTutup }: { isi: IsiBanner; onTutup: () => void }) {
  const ok = isi.nada === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
        ok ? "border-[#A7F3D0] bg-[#ECFDF5]" : "border-[#FECACA] bg-[#FEF2F2]"
      }`}
    >
      <Ikon nama={ok ? "centang" : "info"} ukuran={18} className={ok ? "text-[#16A34A]" : "text-[#DC2626]"} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-[#0F172A]">{isi.judul}</p>
        {isi.deskripsi && <p className="truncate text-[11px] text-[#334155]">{isi.deskripsi}</p>}
      </div>
      {isi.kode && (
        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#16A34A]">{isi.kode}</span>
      )}
      <button
        type="button"
        onClick={onTutup}
        aria-label="Tutup pemberitahuan"
        className="grid h-8 w-8 place-items-center rounded-lg text-[#64748B] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#60A5FA]"
      >
        <Ikon nama="tutup" ukuran={14} />
      </button>
    </div>
  );
}
