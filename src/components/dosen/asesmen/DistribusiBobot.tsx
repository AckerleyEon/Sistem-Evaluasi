import { lencanaBobot, posisiCallout } from "@/lib/asesmen-tampilan";
import { KARTU, KartuJudul, FOKUS } from "./KartuUI";
import type { TugasRow } from "./tipe";

export const WARNA_BOBOT = ["#1E3A8A", "#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#3B82F6"];
// Warna segmen yang terang memakai teks gelap supaya callout tetap terbaca.
const TERANG = new Set(["#93C5FD", "#BFDBFE", "#60A5FA"]);
const MAKS_CALLOUT = 8;

const LENCANA: Record<"biru" | "oranye" | "merah" | "abu", string> = {
  biru: "bg-[#DBEAFE] text-[#1D4ED8]",
  oranye: "bg-[#FFEDD5] text-[#EA580C]",
  merah: "bg-[#FEE2E2] text-[#DC2626]",
  abu: "bg-[#F1F5F9] text-[#64748B]",
};

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
  const lencana = lencanaBobot(total, tugas.length);
  const pakaiCallout = tugas.length <= MAKS_CALLOUT;
  const posisi = posisiCallout(tugas.map((t) => t.bobot));
  const terakhir = tugas.at(-1);

  return (
    <section className={`${KARTU} p-5 lg:col-span-7`}>
      <KartuJudul
        judul="Distribusi Bobot Tugas"
        subjudul={
          terakhir
            ? `Alokasi diperbarui proporsional setelah ${terakhir.kode} ditambahkan`
            : "Alokasi bobot per instrumen; berubah proporsional saat tugas ditambah atau dihapus"
        }
        aksi={
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LENCANA[lencana.nada]}`}>
            {lencana.teks}
          </span>
        }
      />

      {tugas.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#64748B]">
          Belum ada tugas. Klik &ldquo;Buat Tugas Baru&rdquo; untuk memulai.
        </p>
      ) : (
        <>
          <div className={`relative ${pakaiCallout ? "sm:py-10" : ""}`}>
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

            {/* Callout bergantian atas/bawah (layar ≥ sm, maksimal 8 tugas) */}
            {pakaiCallout &&
              tugas.map((t, i) => {
                const warna = WARNA_BOBOT[i % 8];
                const { kiri, atas } = posisi[i];
                const sorot = t.id === sorotId || t.kode === kodeAktif;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPilih(t.kode)}
                    title={`${t.kode} – ${t.nama}`}
                    aria-pressed={t.kode === kodeAktif}
                    style={{ left: `${kiri}%`, background: warna }}
                    className={`absolute hidden -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold sm:flex ${atas ? "top-0" : "bottom-0"} ${
                      TERANG.has(warna) ? "text-[#0F172A]" : "text-white"
                    } ${sorot ? "ring-2 ring-[#0F172A]/30" : ""} ${FOKUS}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t.kode} {t.bobot}%
                    <span
                      aria-hidden="true"
                      style={{ background: warna }}
                      className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${atas ? "-bottom-1" : "-top-1"}`}
                    />
                  </button>
                );
              })}
          </div>

          {/* Cadangan: layar sempit, atau lebih dari 8 tugas */}
          <ul className={`mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 ${pakaiCallout ? "sm:hidden" : ""}`}>
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
