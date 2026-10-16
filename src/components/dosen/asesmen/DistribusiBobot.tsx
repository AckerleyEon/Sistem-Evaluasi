import { KARTU, KartuJudul, FOKUS } from "./KartuUI";
import type { TugasRow } from "./tipe";

export const WARNA_BOBOT = ["#1E3A8A", "#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#3B82F6"];

export function DistribusiBobot({
  tugas,
  sorotId,
  kodeAktif,
  onPilih,
}: {
  tugas: TugasRow[];
  sorotId: string | null;
  kodeAktif: string | null;
  onPilih: (kode: string) => void;
}) {
  const total = Math.round(tugas.reduce((s, t) => s + t.bobot, 0) * 10) / 10;
  const pas = total === 100;

  return (
    <section className={`${KARTU} p-5 lg:col-span-7`}>
      <KartuJudul
        judul="Distribusi Bobot Tugas"
        subjudul="Alokasi bobot per instrumen; berubah proporsional saat tugas ditambah atau dihapus"
        aksi={
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              pas ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#FFEDD5] text-[#EA580C]"
            }`}
          >
            {tugas.length === 0 ? "Belum ada tugas" : pas ? "100% Terpakai" : `${total}% Terpakai`}
          </span>
        }
      />

      {tugas.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#64748B]">
          Belum ada tugas. Klik &ldquo;Buat Tugas Baru&rdquo; untuk memulai.
        </p>
      ) : (
        <>
          <div
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`Distribusi bobot: ${tugas.map((t) => `${t.kode} ${t.bobot}%`).join(", ")}`}
          >
            {tugas.map((t, i) => (
              <span
                key={t.id}
                title={`${t.kode} – ${t.nama}: ${t.bobot}%`}
                style={{ width: `${(t.bobot / Math.max(total, 100)) * 100}%`, background: WARNA_BOBOT[i % 8] }}
              />
            ))}
          </div>

          <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {tugas.map((t, i) => {
              const sorot = t.id === sorotId || t.kode === kodeAktif;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPilih(t.kode)}
                    title={`${t.kode} – ${t.nama}`}
                    aria-pressed={t.kode === kodeAktif}
                    className={`flex w-full flex-col items-center rounded-lg px-1 py-1.5 text-center transition ${FOKUS} ${
                      sorot ? "border-[1.5px] border-[#2563EB] bg-[#EFF6FF]" : "border border-[#E5E7EB] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: WARNA_BOBOT[i % 8] }} />
                      {t.kode}
                    </span>
                    <span className="text-[11px] font-bold text-[#1D4ED8]">{t.bobot}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
