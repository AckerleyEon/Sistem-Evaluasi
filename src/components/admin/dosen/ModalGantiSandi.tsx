"use client";

import { useState } from "react";
import { gantiSandiDosen } from "@/lib/actions/dosen";
import { namaDenganGelar } from "@/lib/dosen";
import type { DosenItem } from "./DosenWorkspace";

const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function acak(panjang = 10) {
  const bytes = new Uint32Array(panjang);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABET[b % ALFABET.length]).join("");
}

export function ModalGantiSandi({
  dosen,
  onTutup,
  onBerhasil,
}: {
  dosen: DosenItem;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [sandi, setSandi] = useState("");
  const [tampil, setTampil] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function buatAcak() {
    setSandi(acak());
    setTampil(true);
    setTersalin(false);
    setError("");
  }

  async function salin() {
    try {
      await navigator.clipboard.writeText(sandi);
      setTersalin(true);
    } catch {
      setTersalin(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.set("sandi", sandi);
    const hasil = await gantiSandiDosen(dosen.id, fd);
    setLoading(false);

    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(`Kata sandi ${dosen.nama} berhasil diganti`);
    onTutup();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onTutup();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-base font-bold text-[#111827]">Ganti Kata Sandi</h2>
        <p className="text-[13px] text-[#6B7280]" style={{ overflowWrap: "anywhere" }}>
          {namaDenganGelar(dosen)} · NIP. {dosen.nip}
        </p>

        <p className="mb-4 mt-3 rounded-xl bg-[#EEF3FD] p-3 text-xs text-[#4B5563]">
          Kata sandi lama tidak bisa ditampilkan karena tersimpan terenkripsi satu arah. Sandi baru ini langsung
          menggantikannya. Catat atau salin sebelum menyimpan, karena tidak akan ditampilkan lagi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="sandi-baru" className="mb-2 block text-[13px] font-medium text-[#111827]">
              Kata sandi baru
            </label>
            <input
              id="sandi-baru"
              type={tampil ? "text" : "password"}
              value={sandi}
              onChange={(e) => {
                setSandi(e.target.value);
                setTersalin(false);
                if (error) setError("");
              }}
              autoComplete="new-password"
              autoFocus
              placeholder="Minimal 6 karakter"
              className={`h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] ${
                error ? "ring-2 ring-[#DC2626]" : "focus:ring-2 focus:ring-[#2F6BE8]/40"
              } ${tampil ? "font-mono tracking-wider" : ""}`}
            />
            {error && <p className="mt-1.5 text-xs text-[#DC2626]">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={buatAcak} className="h-9 rounded-lg bg-[#EEF3FD] px-3 text-xs font-semibold text-[#2F6BE8]">
              Acak
            </button>
            <button
              type="button"
              onClick={() => setTampil((v) => !v)}
              className="h-9 rounded-lg bg-[#EEF3FD] px-3 text-xs font-semibold text-[#2F6BE8]"
            >
              {tampil ? "Sembunyikan" : "Lihat"}
            </button>
            <button
              type="button"
              onClick={salin}
              disabled={!sandi}
              className="h-9 rounded-lg bg-[#EEF3FD] px-3 text-xs font-semibold text-[#2F6BE8] disabled:opacity-50"
            >
              {tersalin ? "Tersalin ✓" : "Salin"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
              Batal
            </button>
            <button
              type="submit"
              disabled={sandi.length < 6 || loading}
              className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Menyimpan…" : "Simpan Sandi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}