"use client";

import { useState } from "react";
import { buatTautanResetUntukDosen } from "@/lib/actions/auth";

export function TombolBuatTautan({ permintaanId }: { permintaanId: string }) {
  const [tautan, setTautan] = useState<{ url: string; berlakuMenit: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tersalin, setTersalin] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const hasil = await buatTautanResetUntukDosen(permintaanId);
      if (hasil.link) {
        setTautan({ url: `${window.location.origin}${hasil.link}`, berlakuMenit: hasil.berlakuMenit ?? 60 });
      } else {
        setError(hasil.error ?? "Tautan gagal dibuat. Coba lagi.");
      }
    } catch {
      setError("Tautan gagal dibuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function salin() {
    if (!tautan) return;
    try {
      await navigator.clipboard.writeText(tautan.url);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      setTersalin(false);
      setError("Tidak bisa menyalin otomatis. Blok tautan di kolom lalu salin manual.");
    }
  }

  if (tautan) {
    return (
      <div className="max-w-md space-y-2">
        <div className="flex gap-2">
          <input
            readOnly
            value={tautan.url}
            aria-label="Tautan reset kata sandi"
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 min-w-0 flex-1 rounded-lg bg-[#EEF3FD] px-3 font-mono text-xs text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
          <button
            type="button"
            onClick={salin}
            className="h-10 shrink-0 rounded-lg bg-[#2F6BE8] px-4 text-xs font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
          >
            {tersalin ? "Tersalin ✓" : "Salin"}
          </button>
        </div>
        <p className="text-xs text-[#6B7280]">
          Berlaku {tautan.berlakuMenit} menit, sekali pakai. Kirim langsung ke dosen yang bersangkutan.
        </p>
        {error && (
          <p role="alert" className="text-xs font-medium text-[#DC2626]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-10 rounded-lg bg-[#EEF3FD] px-4 text-[13px] font-semibold text-[#2F6BE8] disabled:opacity-60 [@media(hover:hover)]:hover:bg-[#DCE7FB]"
      >
        {loading ? "Membuat…" : "Buatkan tautan reset"}
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-[#DC2626]">
          {error}
        </p>
      )}
    </div>
  );
}
