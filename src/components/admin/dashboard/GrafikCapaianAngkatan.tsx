import type { TitikAngkatan } from "./tipe";
import { ChartCard } from "./ChartCard";
import { Ikon } from "./Ikon";

const W = 640;
const H = 250;
const KIRI = 44;
const KANAN = 16;
const ATAS = 22;
const BAWAH = 48;
const LEBAR = W - KIRI - KANAN;
const TINGGI = H - ATAS - BAWAH;

export function GrafikCapaianAngkatan({ data }: { data: TitikAngkatan[] }) {
  const y = (v: number) => ATAS + TINGGI * (1 - v / 100);
  const x = (i: number) => KIRI + ((i + 0.5) * LEBAR) / Math.max(data.length, 1);
  const titik = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.rata) }));
  const garis = titik.map((t, i) => `${i ? "L" : "M"}${t.cx},${t.cy}`).join(" ");
  const area = titik.length
    ? `${garis} L${titik[titik.length - 1].cx},${y(0)} L${titik[0].cx},${y(0)} Z`
    : "";
  const teratas = new Set(
    [...titik]
      .sort((a, b) => b.rata - a.rata)
      .slice(0, 2)
      .map((t) => t.angkatan),
  );
  const ringkasan = data.map((d) => `Angkatan ${d.angkatan}: ${Math.round(d.rata)}%`).join(", ");

  return (
    <ChartCard
      judul="Analisis Profil Ketercapaian CPL Lintas Angkatan"
      subjudul="Menganalisis rata-rata capaian dari setiap angkatan"
      className="lg:col-span-8"
    >
      {data.length === 0 ? (
        <p className="grid flex-1 place-items-center py-16 text-[13px] text-[#64748B]">
          Belum ada hasil CPL pada tahun ajaran ini.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Rata-rata capaian CPL per angkatan. ${ringkasan}`}
        >
          <defs>
            <linearGradient id="areaCapaian" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={KIRI} x2={W - KANAN} y1={y(v)} y2={y(v)} stroke="#E2E8F0" strokeWidth="1" />
              <text x={KIRI - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748B">
                {v}%
              </text>
            </g>
          ))}

          {titik.map((t) => (
            <line key={`v${t.angkatan}`} x1={t.cx} x2={t.cx} y1={ATAS} y2={y(0)} stroke="#E2E8F0" strokeWidth="1" opacity="0.6" />
          ))}

          <path d={area} fill="url(#areaCapaian)" />
          <path d={garis} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {titik.map((t) => (
            <g key={t.angkatan}>
              <circle cx={t.cx} cy={t.cy} r="4.5" fill="#1D4ED8" stroke="#fff" strokeWidth="2">
                <title>{`Angkatan ${t.angkatan}: ${t.rata}% (${t.jumlah} hasil CPL)`}</title>
              </circle>
              {teratas.has(t.angkatan) && (
                <g>
                  <rect x={t.cx - 20} y={t.cy - 28} width="40" height="18" rx="4" fill="#2563EB" />
                  <text x={t.cx} y={t.cy - 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                    {Math.round(t.rata)}%
                  </text>
                </g>
              )}
              <text x={t.cx} y={H - 24} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B">
                Angkatan
              </text>
              <text x={t.cx} y={H - 9} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1D4ED8">
                {t.angkatan}
              </text>
            </g>
          ))}
        </svg>
      )}

      <p className="mt-2 flex items-start gap-2 text-[11px] text-[#334155]">
        <Ikon nama="tren" ukuran={14} className="mt-px shrink-0 text-[#16A34A]" />
        <span>
          <b>Seluruh CPL</b> dirata-rata pada tiap angkatan dan ditampilkan sebagai bahan analisis tiap angkatan.
        </span>
      </p>
    </ChartCard>
  );
}
