"use client";

export type ItemDaftar = {
  id: string;
  judul: string;
  badges: string[];
  deskripsi: string;
  bobot: number | null;
  belumDikaitkan: boolean; // null = belum dikaitkan
};

export function KartuDaftar({
  judul,
  subjudul,
  kosong,
  items,
  terbukaId,
  prefiks,
  onToggle,
  onEdit,
  onHapus,
}: {
  judul: string;
  subjudul: string;
  kosong: string;
  items: ItemDaftar[];
  terbukaId: string | null;
  prefiks: string;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onHapus: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111827]">{judul}</h2>
        <span className="rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8]">{items.length}</span>
      </div>
      <p className="mb-3 text-xs text-[#6B7280]">{subjudul}</p>

      {items.length === 0 ? (
        <p className="rounded-xl bg-[#F8FAFF] px-4 py-8 text-center text-sm text-[#6B7280]">{kosong}</p>
      ) : (
        <ul className="max-h-105 divide-y divide-[#F1F3F5] overflow-y-auto">
          {items.map((it) => {
            const buka = it.id === terbukaId;
            const idPanel = `${prefiks}-${it.id}`;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onToggle(it.id)}
                  aria-expanded={buka}
                  aria-controls={idPanel}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline focus-visible:outline-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#F8FAFC]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#111827]">{it.judul}</span>
                      {it.badges.length > 0 && <span className="sr-only">Terhubung ke</span>}
                      {it.badges.map((b) => (
                        <span key={b} className="rounded-full bg-[#EEF3FD] px-2 py-0.5 text-xs font-semibold text-[#2F6BE8]">
                          {b}
                        </span>
                      ))}
                      {it.belumDikaitkan && (
                        <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">
                          Belum dikaitkan
                        </span>
                      )}
                    </span>
                    {!buka && <span className="mt-0.5 block truncate text-xs text-[#6B7280]">{it.deskripsi}</span>}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 transition-transform ${buka ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {buka && (
                  <div id={idPanel} className="mb-3 rounded-lg bg-[#F1F5F9] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs leading-5 text-[#111827]" style={{ overflowWrap: "anywhere" }}>
                        {it.deskripsi}
                      </p>
                      {it.bobot !== null && (
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-[#6B7280]">Bobot</p>
                          <p className="text-sm font-bold text-[#2F6BE8]">{it.bobot}%</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => onEdit(it.id)}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-[#2F6BE8] px-4 text-xs font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Sesuaikan
                      </button>
                      <button
                        onClick={() => onHapus(it.id)}
                        aria-label={`Hapus ${it.judul}`}
                        title={`Hapus ${it.judul}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#FEE2E2] [@media(hover:hover)]:hover:text-[#DC2626]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}