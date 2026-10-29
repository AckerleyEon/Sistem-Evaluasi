import { Ikon } from "../Ikon";
import { daftarSubUnik } from "@/lib/asesmen-tampilan";
import { KARTU, KartuJudul, FOKUS } from "./KartuUI";
import type { CpmkOpsi, TugasRow } from "./tipe";

export function MatriksSub({
  cpmk,
  tugas,
  sorotId,
  kodeAktif,
  onPilih,
}: {
  cpmk: CpmkOpsi[];
  tugas: TugasRow[];
  sorotId: string | null;
  kodeAktif: string | null;
  onPilih: (kode: string) => void;
}) {
  const subs = daftarSubUnik(cpmk);

  return (
    <section className={`${KARTU} p-5 lg:col-span-5`}>
      <KartuJudul
        judul="Matriks Pemetaan Sub-CPMK"
        aksi={<Ikon nama="hierarki" ukuran={20} className="text-[#2563EB]" />}
      />

      {subs.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#64748B]">
          Belum ada Sub-CPMK untuk mata kuliah ini. Minta admin menyusun CPMK dan Sub-CPMK terlebih dahulu.
        </p>
      ) : (
        <ul
          role="region"
          aria-label="Matriks pemetaan Sub-CPMK"
          tabIndex={0}
          className={`max-h-[180px] space-y-2 overflow-y-auto pr-1 ${FOKUS}`}
        >
          {subs.map((s) => {
            const terkait = tugas.filter((t) => t.subIds.includes(s.id));
            return (
              <li
                key={s.id}
                className={`flex min-h-[34px] flex-wrap items-center gap-2 rounded-[10px] px-2.5 py-1.5 ${
                  terkait.length === 0
                    ? "border border-dashed border-[#EA580C] bg-[#FFF7ED]"
                    : "border border-[#E5E7EB] bg-[#F3F5F9]"
                }`}
              >
                <span className="shrink-0 rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[11px] font-bold text-white">
                  Sub-{s.angka}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#334155]" title={s.deskripsi}>
                  {s.deskripsi}
                </span>
                {terkait.length === 0 ? (
                  <span className="text-[11px] font-semibold text-[#EA580C]">Belum ada tugas</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {terkait.map((t) => {
                      const baru = t.id === sorotId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onPilih(t.kode)}
                          aria-pressed={t.kode === kodeAktif}
                          title={t.nama}
                          className={`min-h-[22px] rounded px-1.5 text-[11px] font-bold ${FOKUS} ${
                            baru || t.kode === kodeAktif ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#1D4ED8]"
                          }`}
                        >
                          {t.kode}
                        </button>
                      );
                    })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
