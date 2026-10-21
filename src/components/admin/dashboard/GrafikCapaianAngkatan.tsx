import type { TitikAngkatan } from "./tipe";
import { ChartCard } from "./ChartCard";
import { Ikon } from "./Ikon";

const H = 250;
const KIRI = 44;
const KANAN = 16;
const ATAS = 22;
const BAWAH = 48;

export function GrafikCapaianAngkatan({ data }: { data: TitikAngkatan[] }) {
  const W = Math.max(640, KIRI + KANAN + data.length * 72);
  const LEBAR = W - KIRI - KANAN;
  const TINGGI = H - ATAS - BAWAH;
  const y = (v: number) => ATAS + TINGGI * (1 - v / 100);
  const x = (i: number) => KIRI + ((i + 0.5) * LEBAR) / Math.max(data.length, 1);
  const titik = data.map((d, i) => ({ ...d, cx: x(i), cy: d.rata === null ? null : y(d.rata) }));
  const segmen: (typeof titik)[] = [];
  let bagian: typeof titik = [];
  for (const point of titik) {
    if (point.rata === null) {
      if (bagian.length > 0) {
        segmen.push(bagian);
        bagian = [];
      }
    } else {
      bagian.push(point);
    }
  }
  if (bagian.length > 0) segmen.push(bagian);
  const ringkasan = data
    .map((d) => `Angkatan ${d.angkatan}: ${d.rata === null ? "belum ada data" : `${Math.round(d.rata)}%`}`)
    .join(", ");
  const adaHasil = data.some((d) => d.rata !== null);

  return (
    <ChartCard
      judul="Analisis Profil Ketercapaian CPL Lintas Angkatan"
      subjudul="Rata-rata capaian seluruh T.A. pada setiap angkatan"
      className="lg:col-span-8"
    >
      {data.length === 0 ? (
        <p className="grid flex-1 place-items-center py-16 text-[13px] text-[#64748B]">
          Belum ada data mahasiswa untuk ditampilkan.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            style={W > 640 ? { minWidth: `${W}px` } : undefined}
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

            {segmen.map((bagian, index) => {
              const garis = bagian.map((t, i) => `${i ? "L" : "M"}${t.cx},${t.cy ?? y(0)}`).join(" ");
              const area = bagian.length > 1
                ? `${garis} L${bagian[bagian.length - 1].cx},${y(0)} L${bagian[0].cx},${y(0)} Z`
                : "";
              return (
                <g key={`segmen-${index}`}>
                  {area && <path d={area} fill="url(#areaCapaian)" />}
                  {bagian.length > 1 && (
                    <path d={garis} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                </g>
              );
            })}

            {titik.map((t) => (
              <g key={t.angkatan}>
                {t.rata !== null && t.cy !== null && (
                  <>
                    <circle cx={t.cx} cy={t.cy} r="4.5" fill="#1D4ED8" stroke="#fff" strokeWidth="2">
                      <title>{`Angkatan ${t.angkatan}: ${t.rata}% (${t.jumlah} hasil CPL)`}</title>
                    </circle>
                    <g>
                      <rect
                        x={t.cx - 22}
                        y={t.cy < ATAS + 32 ? t.cy + 10 : t.cy - 28}
                        width="44"
                        height="18"
                        rx="4"
                        fill="#2563EB"
                      />
                      <text
                        x={t.cx}
                        y={t.cy < ATAS + 32 ? t.cy + 23 : t.cy - 15}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#fff"
                      >
                        {Math.round(t.rata)}%
                      </text>
                    </g>
                  </>
                )}
                <text x={t.cx} y={H - 24} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B">
                  Angkatan {t.angkatan}
                </text>
                {t.rata === null && (
                  <text x={t.cx} y={H - 9} textAnchor="middle" fontSize="10" fontWeight="500" fill="#94A3B8">
                    Belum ada data
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}

      {data.length > 0 && !adaHasil && (
        <p className="mt-2 text-[11px] text-[#64748B]">
          Persentase belum tersedia karena belum ada hasil perhitungan CPL pada seluruh tahun ajaran.
        </p>
      )}

      <p className="mt-2 flex items-start gap-2 text-[11px] text-[#334155]">
        <Ikon nama="tren" ukuran={14} className="mt-px shrink-0 text-[#16A34A]" />
        <span>
          <b>Seluruh CPL dari semua T.A.</b> dirata-rata pada tiap angkatan; grafik ini tidak mengikuti T.A. aktif.
        </span>
      </p>
    </ChartCard>
  );
}
