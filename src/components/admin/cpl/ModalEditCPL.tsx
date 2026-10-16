"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDeskripsiCPL } from "@/lib/actions/cpl";
import type { CplItem } from "./CplWorkspace";

export function ModalEditCPL({ cpl, onTutup }: { cpl: CplItem; onTutup: () => void }) {
  const router = useRouter();
  const [deskripsi, setDeskripsi] = useState(cpl.deskripsi);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const berubah = deskripsi.trim() !== cpl.deskripsi.trim();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.set("deskripsi", deskripsi);
    const hasil = await updateDeskripsiCPL(cpl.id, fd);
    setLoading(false);

    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onTutup();
    router.replace(`/admin/data-master/cpl?diubah=${encodeURIComponent(hasil.kode ?? cpl.kode)}`);
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
        <h2 className="text-base font-bold text-[#111827]">Edit Deskripsi {cpl.kode}</h2>
        <p className="mb-4 text-[13px] text-[#6B7280]">Kode CPL tidak dapat diubah dari sini.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#111827]">Kode CPL</label>
            <input
              value={cpl.kode}
              disabled
              className="h-11 w-full rounded-[10px] bg-[#F1F3F5] px-4 text-sm font-semibold text-[#6B7280]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="deskripsi-edit" className="text-[13px] font-medium text-[#111827]">
                Deskripsi
              </label>
              <span className="text-xs text-[#6B7280]">{deskripsi.length}/500</span>
            </div>
            <textarea
              id="deskripsi-edit"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value.slice(0, 500))}
              autoFocus
              className="min-h-47.5 w-full resize-y rounded-[10px] bg-[#EEF3FD] p-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
            />
            {error && <p className="mt-1.5 text-xs text-[#DC2626]">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
              Batal
            </button>
            <button
              type="submit"
              disabled={!berubah || loading}
              className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}