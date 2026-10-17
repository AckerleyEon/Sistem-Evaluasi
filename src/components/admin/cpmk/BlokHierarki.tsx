"use client";

import { jumlahBobot, type CpmkTerkait, type KomponenSub } from "./tipe";

const ikonPensil = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const ikonSampah = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const ikonLepas = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    <path d="m3 3 18 18" />
  </svg>
);

export function BlokHierarki({
  cpmk,
  terbuka,
  onToggle,
  onTambahSub,
  onKaitkanSub,
  onEditCpmk,
  onHapusCpmk,
  onEditSub,
  onLepasSub,
  onHapusSub,
}: {
  cpmk: CpmkTerkait;
  terbuka: boolean;
  onToggle: () => void;
  onTambahSub: () => void;
  onKaitkanSub: () => void;
  onEditCpmk: () => void;
  onHapusCpmk: () => void;
  onEditSub: (s: KomponenSub) => void;
  onLepasSub: (s: KomponenSub) => void;
  onHapusSub: (s: KomponenSub) => void;
}) {
  const totalSub = jumlahBobot(cpmk.sub);
  const status =
    totalSub === 100
      ? { kelas: "text-[#15803D]", ikon: "✓" }
      : totalSub < 100
      ? { kelas: "text-[#B45309]", ikon: "!" }
      : { kelas: "text-[#DC2626]", ikon: "✕" };
  const idTabel = `hierarki-${cpmk.id}`;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-[#EFF6FF] px-5 py-4">
        <span className="rounded-md bg-[#2F6BE8] px-2.5 py-1 text-xs font-bold text-white">{cpmk.kode}</span>
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="line-clamp-2 text-sm font-semibold text-[#111827]" style={{ overflowWrap: "anywhere" }}>
            {cpmk.deskripsi}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#6B7280]">Terhubung ke</span>
            {cpmk.cpl.map((c) => (
              <span key={c.id} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2F6BE8]">
                {c.kode}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onTambahSub}
          disabled={totalSub >= 100}
          title={totalSub >= 100 ? "Alokasi bobot Sub-CPMK sudah mencapai 100%" : "Tambah butir Sub-CPMK ke CPMK ini"}
          className="flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-[#2F6BE8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">+</span> Tambah Butir Sub-CPMK
        </button>
        <button
          onClick={onKaitkanSub}
          className="flex h-9 items-center gap-1.5 rounded-full bg-[#2F6BE8] px-4 text-xs font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
        >
          <span aria-hidden="true">+</span> Kaitkan Sub-CPMK
        </button>
        <div className="text-right">
          <p className="text-xs text-[#6B7280]">Bobot CPMK</p>
          <p className="text-lg font-bold leading-6 text-[#2F6BE8]">{cpmk.bobot}%</p>
        </div>
        <button
          onClick={onEditCpmk}
          aria-label={`Sesuaikan ${cpmk.kode}`}
          title="Sesuaikan CPMK"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
        >
          {ikonPensil}
        </button>
        <button
          onClick={onHapusCpmk}
          aria-label={`Hapus ${cpmk.kode}`}
          title="Hapus CPMK"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#DC2626] [@media(hover:hover)]:hover:bg-[#FEE2E2]"
        >
          {ikonSampah}
        </button>
        <button
          onClick={onToggle}
          aria-expanded={terbuka}
          aria-controls={idTabel}
          aria-label={`${terbuka ? "Tutup" : "Buka"} ${cpmk.kode}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#4B5563]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${terbuka ? "rotate-180" : ""}`} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {terbuka && (
        <div id={idTabel}>
          {cpmk.sub.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#6B7280]">
              <p className="mb-3">Belum ada Sub-CPMK yang dikaitkan.</p>
              <button
                onClick={onTambahSub}
                disabled={totalSub >= 100}
                className="mr-2 h-9 rounded-full bg-[#2F6BE8] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Tambah Butir Sub-CPMK
              </button>
              <button onClick={onKaitkanSub} className="h-9 rounded-full bg-[#2F6BE8] px-4 text-xs font-semibold text-white">
                Kaitkan Sub-CPMK
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 border-collapse">
                <caption className="sr-only">Sub-CPMK di bawah {cpmk.kode}</caption>
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[.06em] text-[#6B7280]">
                    <th scope="col" className="w-32 px-5 py-3">Kode</th>
                    <th scope="col" className="px-2 py-3">Indikator Kemampuan</th>
                    <th scope="col" className="w-24 px-2 py-3 text-center">Bobot</th>
                    <th scope="col" className="w-24 px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cpmk.sub.map((s) => (
                    <tr key={s.id} className="border-t border-[#E8EAEE]">
                      <td className="px-5 py-3 align-top">
                        <button onClick={() => onEditSub(s)} className="text-sm font-semibold text-[#2F6BE8] hover:underline">
                          {s.kode}
                        </button>
                      </td>
                      <td className="px-2 py-3 align-top text-sm text-[#111827]">
                        <p className="line-clamp-2" style={{ overflowWrap: "anywhere" }}>{s.deskripsi}</p>
                      </td>
                      <td className="px-2 py-3 text-center align-top text-sm font-semibold text-[#111827]">{s.bobot}%</td>
                      <td className="px-5 py-2 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditSub(s)}
                            aria-label={`Edit ${s.kode}`}
                            title="Edit Sub-CPMK"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#EFF6FF] [@media(hover:hover)]:hover:text-[#2563EB]"
                          >
                            {ikonPensil}
                          </button>
                          <button
                            onClick={() => onLepasSub(s)}
                            aria-label={`Lepas ${s.kode} dari ${cpmk.kode}`}
                            title="Lepas dari CPMK"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] [@media(hover:hover)]:hover:bg-[#F3F4F6] [@media(hover:hover)]:hover:text-[#111827]"
                          >
                            {ikonLepas}
                          </button>
                          <button
                            onClick={() => onHapusSub(s)}
                            aria-label={`Hapus ${s.kode}`}
                            title="Hapus Sub-CPMK"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#DC2626] [@media(hover:hover)]:hover:bg-[#FEE2E2]"
                          >
                            {ikonSampah}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={`flex items-center gap-1.5 border-t border-[#E8EAEE] px-5 py-3 text-xs font-semibold ${status.kelas}`}>
            <span aria-hidden="true">{status.ikon}</span>
            Total alokasi Sub-CPMK: {totalSub}% dari 100%
          </div>
        </div>
      )}
    </section>
  );
}