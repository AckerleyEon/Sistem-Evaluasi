"use client";

import { useState } from "react";
import { createCPL } from "@/lib/actions/cpl";

const POLA_KODE = /^CPL-\d{2,3}$/;

export function FormCPL({ kodeBerikutnya, kodeTerpakai }: { kodeBerikutnya: string; kodeTerpakai: string[] }) {
  const [kode, setKode] = useState(kodeBerikutnya);
  const [deskripsi, setDeskripsi] = useState("");
  const [errorKode, setErrorKode] = useState("");
  const [loading, setLoading] = useState(false);

  function validasiKode(nilai: string) {
    if (!POLA_KODE.test(nilai)) {
      setErrorKode("Format harus CPL- diikuti 2-3 digit, contoh CPL-09.");
      return false;
    }
    if (kodeTerpakai.includes(nilai)) {
      setErrorKode(`Kode ${nilai} sudah dipakai. Gunakan kode lain.`);
      return false;
    }
    setErrorKode("");
    return true;
  }

  async function handleSubmit(formData: FormData) {
    if (!validasiKode(kode)) return;
    setLoading(true);
    await createCPL(formData);
  }

  function handleReset() {
    setKode(kodeBerikutnya);
    setDeskripsi("");
    setErrorKode("");
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <h2 className="text-lg font-bold leading-6 text-[#111827]">Tambah CPL</h2>
      <p className="mb-5 text-[13px] text-[#6B7280]">Isi informasi CPL yang ingin ditambahkan.</p>

      <form action={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="kode" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Kode CPL
          </label>
          <input
            id="kode"
            name="kode"
            value={kode}
            onChange={(e) => {
              setKode(e.target.value);
              if (errorKode) setErrorKode("");
            }}
            onBlur={() => validasiKode(kode)}
            className={`h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none ${
              errorKode ? "ring-2 ring-[#DC2626]" : "focus:ring-2 focus:ring-[#2F6BE8]/40"
            }`}
          />
          {errorKode && <p className="mt-1.5 text-xs text-[#DC2626]">{errorKode}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="deskripsi" className="text-[13px] font-medium text-[#111827]">
              Deskripsi
            </label>
            <span className="text-xs text-[#6B7280]">{deskripsi.length}/500</span>
          </div>
          <textarea
            id="deskripsi"
            name="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value.slice(0, 500))}
            placeholder="Mampu melakukan…"
            required
            className="min-h-38.5 w-full resize-y rounded-[10px] bg-[#EEF3FD] p-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleReset} className="h-12.5 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#2F6BE8]">
            Reset
          </button>
          <button type="submit" disabled={loading} className="h-12.5 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}