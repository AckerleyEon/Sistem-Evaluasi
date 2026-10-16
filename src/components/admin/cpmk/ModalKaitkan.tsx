"use client";

import { useState } from "react";
import { ModalShell } from "@/components/admin/mk/ModalShell";

export type Kandidat = { id: string; kode: string; deskripsi: string; badges: string[] };

export function ModalKaitkan({
  judul,
  subjudul,
  kosong,
  labelBuatBaru,
  kandidat,
  terisiLain,
  batas,
  labelSimpan,
  onSimpan,
  onBuatBaru,
  onTutup,
  onBerhasil,
}: {
  judul: string;
  subjudul: string;
  kosong: string;
  labelBuatBaru: string;
  kandidat: Kandidat[];
  terisiLain: number;
  batas: number;
  labelSimpan: string;
  onSimpan: (items: { id: string; bobot: number }[]) => Promise<{ error?: string; jumlah?: number }>;
  onBuatBaru: () => void;
  onTutup: () => void;
  onBerhasil: (jumlah: number) => void;
}) {
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const kata = cari.trim().toLowerCase();
  const tampil = kata
    ? kandidat.filter((k) => k.kode.toLowerCase().includes(kata) || k.deskripsi.toLowerCase().includes(kata))
    : kandidat;

  const entri = Object.entries(pilih);
  const totalDipilih = entri.reduce((jumlah, [, b]) => jumlah + (Number(b) || 0), 0);
  const semuaValid =
    entri.length > 0 &&
    entri.every(([, b]) => {
      const n = Number(b);
      return b !== "" && Number.isInteger(n) && n >= 1;
    });
  const total = terisiLain + totalDipilih;
  const melebihi = total > batas;
  const persen = batas > 0 ? Math.min(100, (total / batas) * 100) : 0;
  const bisaSimpan = semuaValid && !melebihi && !loading;

  function toggle(id: string) {
    setError("");
    setPilih((prev) => {
      if (id in prev) {
        const baru = { ...prev };
        delete baru[id];
        return baru;
      }
      const dipakai = Object.values(prev).reduce((jumlah, b) => jumlah + (Number(b) || 0), 0);
      const sisaBebas = Math.max(0, batas - terisiLain - dipakai);
      return { ...prev, [id]: sisaBebas > 0 ? String(sisaBebas) : "" };
    });
  }

  function ubahBobot(id: string, nilai: string) {
    setError("");
    setPilih((prev) => ({ ...prev, [id]: nilai }));
  }

  async function handleSimpan() {
    setError("");
    setLoading(true);
    const hasil = await onSimpan(entri.map(([id, b]) => ({ id, bobot: Number(b) })));
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(hasil.jumlah ?? entri.length);
  }

  return (
    <ModalShell onTutup={onTutup} lebar="max-w-lg">
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#111827]">{judul}</h2>
          <p className="text-[13px] text-[#6B7280]" style={{ overflowWrap: "anywhere" }}>{subjudul}</p>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-[#4B5563]">
          ✕
        </button>
      </div>

      {kandidat.length === 0 ? (
        <div className="rounded-xl bg-[#F8FAFF] px-5 py-8 text-center">
          <p className="mb-3 text-sm text-[#6B7280]">{kosong}</p>
          <button onClick={onBuatBaru} className="h-10 rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white">
            {labelBuatBaru}
          </button>
        </div>
      ) : (
        <>
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode atau deskripsi..."
            autoFocus
            className="mb-3 h-10 w-full rounded-full bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#2F6BE8]/30"
          />

          <ul className="max-h-72 divide-y divide-[#F1F3F5] overflow-y-auto rounded-xl border border-[#E8EAEE]">
            {tampil.length === 0 && <li className="px-4 py-6 text-center text-sm text-[#6B7280]">Tidak ditemukan.</li>}
            {tampil.map((k) => {
              const terpilih = k.id in pilih;
              return (
                <li key={k.id}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <input
                      id={`kaitkan-${k.id}`}
                      type="checkbox"
                      checked={terpilih}
                      onChange={() => toggle(k.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#2F6BE8]"
                    />
                    <label htmlFor={`kaitkan-${k.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-[#111827]">{k.kode}</span>
                        {k.badges.map((b) => (
                          <span key={b} className="rounded-full bg-[#EEF3FD] px-2 py-0.5 text-xs font-semibold text-[#2F6BE8]">
                            {b}
                          </span>
                        ))}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-[#6B7280]" style={{ overflowWrap: "anywhere" }}>
                        {k.deskripsi}
                      </span>
                    </label>
                    {terpilih && (
                      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#EEF3FD] px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          max={batas}
                          inputMode="numeric"
                          aria-label={`Bobot ${k.kode}`}
                          value={pilih[k.id]}
                          onChange={(e) => ubahBobot(k.id, e.target.value)}
                          className="w-12 bg-transparent text-right text-sm font-bold text-[#2F6BE8] outline-none"
                        />
                        <span className="text-sm font-bold text-[#2F6BE8]">%</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-[10px] bg-[#EEF3FD] p-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={batas}
              aria-valuenow={Math.min(total, batas)}
              aria-label={`Terisi ${total} dari ${batas} persen`}
              className="h-2 overflow-hidden rounded-full bg-white"
            >
              <div
                className={`h-full rounded-full transition-[width] ${melebihi ? "bg-[#DC2626]" : "bg-[#2F6BE8]"}`}
                style={{ width: `${persen}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              {melebihi ? (
                <span className="font-medium text-[#DC2626]">Melebihi sisa kuota ({Math.max(0, batas - terisiLain)}%)</span>
              ) : (
                <span className="font-medium text-[#15803D]">
                  Sisa kuota bobot: {Math.max(0, batas - terisiLain - totalDipilih)}%
                </span>
              )}
              <span className="text-[#4B5563]">
                Terisi {terisiLain}% + dipilih {totalDipilih}% = {total}%
              </span>
            </div>
          </div>

          {error && <p className="mt-3 text-xs font-medium text-[#DC2626]">{error}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={onTutup} className="h-11 rounded-full bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
              Batal
            </button>
            <button
              type="button"
              onClick={handleSimpan}
              disabled={!bisaSimpan}
              className="h-11 rounded-full bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Menyimpan…" : `${labelSimpan}${entri.length > 0 ? ` (${entri.length})` : ""}`}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}