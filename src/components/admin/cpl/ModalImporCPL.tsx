"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analisisImporCPL, terapkanImporCPL, type BarisImporCPL } from "@/lib/actions/cpl";

type Analisis = {
  baris: BarisImporCPL[];
  baru: number;
  duplikat: number;
  galat: number;
};

export function ModalImporCPL({ onTutup }: { onTutup: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [error, setError] = useState("");
  const [selesai, setSelesai] = useState("");
  const [loading, setLoading] = useState(false);

  async function periksaFile() {
    const file = inputRef.current?.files?.[0];
    setError("");
    setSelesai("");
    setAnalisis(null);
    if (!file) {
      setError("Pilih file Excel yang sudah diisi.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    const hasil = await analisisImporCPL(formData);
    setLoading(false);
    if (!hasil.ok) {
      setError(hasil.error);
      return;
    }
    setAnalisis({
      baris: hasil.baris,
      baru: hasil.baru,
      duplikat: hasil.duplikat,
      galat: hasil.galat,
    });
  }

  async function terapkan() {
    if (!analisis) return;
    setError("");
    setLoading(true);
    const hasil = await terapkanImporCPL(analisis.baris);
    setLoading(false);
    if (!hasil.ok) {
      setError(hasil.error);
      return;
    }
    setSelesai(`${hasil.ditambahkan} CPL berhasil ditambahkan. CPL dengan kode yang sudah terdaftar tidak diubah.`);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-impor-cpl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onTutup();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !loading) onTutup();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="judul-impor-cpl" className="text-base font-bold text-[#111827]">
              Impor CPL dari Excel
            </h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Kolom wajib: Kode CPL dan Deskripsi. Kode yang sudah ada dilewati dan tidak mengubah data CPL.
            </p>
            <a
              href="/api/admin/cpl/template"
              download
              className="mt-1 inline-block text-[13px] font-semibold text-[#2F6BE8] hover:underline"
            >
              Unduh template Excel
            </a>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            aria-label="Tutup"
            className="rounded-full bg-[#F1F3F5] px-3 py-1.5 text-sm text-[#4B5563] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={() => {
              setAnalisis(null);
              setError("");
              setSelesai("");
            }}
            aria-label="Pilih file Excel CPL"
            className="block min-w-0 flex-1 text-sm text-[#111827] file:mr-3 file:h-10 file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-sm file:font-semibold file:text-[#111827]"
          />
          <button
            type="button"
            onClick={periksaFile}
            disabled={loading}
            className="h-10 rounded-[10px] bg-[#2F6BE8] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Periksa file"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
            {error}
          </p>
        )}
        {selesai && (
          <p role="status" className="mt-3 rounded-lg bg-[#DCFCE7] px-3 py-2 text-sm text-[#166534]">
            {selesai}
          </p>
        )}

        {analisis && (
          <>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <p className="rounded-lg bg-[#DCFCE7] px-3 py-2 text-[#166534]">{analisis.baru} CPL baru</p>
              <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.duplikat} kode sudah terdaftar</p>
              <p className={`rounded-lg px-3 py-2 ${analisis.galat ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#F1F3F5] text-[#4B5563]"}`}>
                {analisis.galat} baris galat
              </p>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[#E8EAEE]">
              <table className="w-full min-w-140 text-left text-xs">
                <thead className="sticky top-0 bg-[#F8FAFC] text-[#6B7280]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Baris</th>
                    <th className="px-3 py-2 font-semibold">Kode CPL</th>
                    <th className="px-3 py-2 font-semibold">Deskripsi</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.baris.map((baris) => (
                    <tr key={baris.baris} className="border-t border-[#F1F3F5] align-top">
                      <td className="px-3 py-2 text-[#6B7280]">{baris.baris}</td>
                      <td className="whitespace-nowrap px-3 py-2">{baris.kode || "–"}</td>
                      <td className="px-3 py-2">{baris.deskripsi || "–"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${
                          baris.status === "baru"
                            ? "bg-[#DCFCE7] text-[#166534]"
                            : baris.status === "duplikat"
                              ? "bg-[#DCE7FB] text-[#1D4ED8]"
                              : "bg-[#FEE2E2] text-[#DC2626]"
                        }`}>
                          {baris.status === "baru" ? "Baru" : baris.status === "duplikat" ? "Dilewati" : "Galat"}
                        </span>
                        {baris.pesan && <span className="mt-1 block text-[#6B7280]">{baris.pesan}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            className="h-11 rounded-[10px] bg-[#EEF3FD] px-6 text-sm font-semibold text-[#111827] disabled:opacity-50"
          >
            {selesai ? "Selesai" : "Batal"}
          </button>
          {analisis && !selesai && (
            <button
              type="button"
              onClick={terapkan}
              disabled={loading || analisis.galat > 0 || analisis.baru === 0}
              className="h-11 rounded-[10px] bg-[#2F6BE8] px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Menyimpan…" : `Impor ${analisis.baru} CPL`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
