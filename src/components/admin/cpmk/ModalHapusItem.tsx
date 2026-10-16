"use client";

import { useState } from "react";
import { ModalShell } from "@/components/admin/mk/ModalShell";

export function ModalHapusItem({
  judul,
  memeriksa,
  blokir,
  labelHapus,
  children,
  onTutup,
  onHapus,
}: {
  judul: string;
  memeriksa: boolean;
  blokir: string | null;
  labelHapus: string;
  children: React.ReactNode;
  onTutup: () => void;
  onHapus: () => Promise<{ error?: string }>;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function konfirmasi() {
    setError("");
    setLoading(true);
    const hasil = await onHapus();
    setLoading(false);
    if (hasil.error) setError(hasil.error);
  }

  return (
    <ModalShell onTutup={onTutup} alert>
      <h2 className="mb-3 text-base font-bold text-[#111827]">{judul}</h2>

      {memeriksa ? (
        <p className="mb-5 text-sm text-[#6B7280]">Memeriksa data terkait…</p>
      ) : blokir ? (
        <div className="mb-5 rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">{blokir}</div>
      ) : (
        <div className="mb-5 space-y-2 text-sm text-[#6B7280]">{children}</div>
      )}

      {error && <p className="mb-3 text-xs font-medium text-[#DC2626]">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button autoFocus onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
          Batal
        </button>
        <button
          onClick={konfirmasi}
          disabled={memeriksa || !!blokir || loading}
          className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#B91C1C]"
        >
          {loading ? "Menghapus…" : labelHapus}
        </button>
      </div>
    </ModalShell>
  );
}