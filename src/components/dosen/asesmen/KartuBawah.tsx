import { Ikon } from "../Ikon";
import { KARTU } from "./KartuUI";

// Panduan dan template belum punya berkas sumber di project, jadi tautan/tombolnya sengaja nonaktif.
export function KartuPanduan() {
  return (
    <section className={`${KARTU} flex gap-4 p-5 lg:col-span-8`}>
      <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[#EFF6FF] text-[#2563EB] sm:grid">
        <Ikon nama="lencana" ukuran={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[14px] font-bold">Panduan Standar Penilaian Berbasis OBE</h2>
          <span className="shrink-0 rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
            Tervalidasi
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#334155]">
          Unduh panduan untuk memahami tata cara pembuatan format matriks asesmen dengan pemetaan CPMK yang konsisten.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <span className="font-bold text-[#2563EB] opacity-60" title="Berkas panduan belum tersedia">
            Unduh Panduan ↓
          </span>
          <span className="font-semibold text-[#334155] opacity-60" title="Halaman belum tersedia">
            Lihat Pemetaan CPL Prodi ↗
          </span>
        </div>
      </div>
    </section>
  );
}

export function KartuUnduh() {
  return (
    <section className="flex flex-col justify-between gap-3 rounded-2xl bg-[#2563EB] p-5 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] lg:col-span-4">
      <div>
        <h2 className="text-[14px] font-bold">Unduh Matriks Asesmen</h2>
        <p className="mt-1 text-[12px] text-white/85">
          Unduh template matriks asesmen untuk memulai tahapan evaluasi.
        </p>
      </div>
      <button
        type="button"
        disabled
        title="Template Excel belum tersedia"
        className="flex min-h-[32px] w-full items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#1D4ED8] opacity-70"
      >
        <Ikon nama="tabel" ukuran={14} />
        Unduh Format Excel (.xlsx)
      </button>
    </section>
  );
}
