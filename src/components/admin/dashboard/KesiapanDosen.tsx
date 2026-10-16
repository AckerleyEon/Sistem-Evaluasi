import type { BarisKesiapan, NadaStatus } from "./tipe";
import { ChartCard } from "./ChartCard";
import { Ikon } from "./Ikon";
import { TombolPengingat } from "./TombolPengingat";

const BADGE: Record<NadaStatus, string> = {
  hijau: "bg-[#DCFCE7] text-[#16A34A]",
  biru: "bg-[#DBEAFE] text-[#1D4ED8]",
  oranye: "bg-[#FFEDD5] text-[#EA580C]",
  merah: "bg-[#FEE2E2] text-[#DC2626]",
};
const AVATAR: Record<NadaStatus, string> = {
  hijau: "bg-[#DBEAFE] text-[#1D4ED8]",
  biru: "bg-[#DBEAFE] text-[#1D4ED8]",
  oranye: "bg-[#FFEDD5] text-[#EA580C]",
  merah: "bg-[#FEE2E2] text-[#DC2626]",
};

export function KesiapanDosen({
  baris,
  tahunAjaranId,
}: {
  baris: BarisKesiapan[];
  tahunAjaranId: string;
}) {
  return (
    <ChartCard
      judul="Kesiapan Input Dosen"
      subjudul="Progres pengisian nilai per mata kuliah"
      aksi={<Ikon nama="bar" ukuran={20} className="text-[#2563EB]" />}
      className="lg:col-span-4 lg:row-span-2"
    >
      {baris.length === 0 ? (
        <p className="grid flex-1 place-items-center py-10 text-center text-[13px] text-[#64748B]">
          Belum ada penugasan dosen pada tahun ajaran ini.
        </p>
      ) : (
        <ul className="flex-1 space-y-1">
          {baris.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${AVATAR[b.nada]}`}
              >
                {b.inisial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-[#0F172A]" title={b.dosen}>
                  {b.dosen}
                </p>
                <p className="line-clamp-2 text-[11px] leading-snug text-[#64748B]" title={b.mataKuliah}>
                  {b.mataKuliah}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[b.nada]}`}>
                  {b.persen}% {b.label}
                </span>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {b.terisi}/{b.total} Mhs
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TombolPengingat tahunAjaranId={tahunAjaranId} />
    </ChartCard>
  );
}
