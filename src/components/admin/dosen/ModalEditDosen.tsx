"use client";

import { useState } from "react";
import { updateDosen } from "@/lib/actions/dosen";
import type { DosenItem } from "./DosenWorkspace";

export function ModalEditDosen({
  dosen,
  onTutup,
  onBerhasil,
}: {
  dosen: DosenItem;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [nama, setNama] = useState(dosen.nama);
  const [gelar, setGelar] = useState(dosen.gelar ?? "");
  const [alias, setAlias] = useState(dosen.alias ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const berubah =
    nama.trim() !== dosen.nama ||
    gelar.trim() !== (dosen.gelar ?? "") ||
    alias.trim() !== (dosen.alias ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.set("nama", nama);
    fd.set("gelar", gelar);
    fd.set("alias", alias);
    const hasil = await updateDosen(dosen.id, fd);
    setLoading(false);

    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(`Data ${nama.trim()} berhasil diperbarui`);
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
        <h2 className="text-base font-bold text-[#111827]">Edit Akun Dosen</h2>
        <p className="mb-4 text-[13px] text-[#6B7280]">NIP dipakai sebagai username login, jadi tidak dapat diubah dari sini.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-nama" className="mb-2 block text-[13px] font-medium text-[#111827]">Nama Lengkap</label>
            <input
              id="edit-nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoFocus
              className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
            />
          </div>

          <div>
            <label htmlFor="edit-gelar" className="mb-2 block text-[13px] font-medium text-[#111827]">Gelar Akademik</label>
            <input
              id="edit-gelar"
              value={gelar}
              onChange={(e) => setGelar(e.target.value)}
              placeholder="Contoh: S.T., M.T., Dr., Prof."
              className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
            />
          </div>

          <div>
            <label htmlFor="edit-alias" className="mb-2 block text-[13px] font-medium text-[#111827]">Alias pada data Excel (opsional)</label>
            <input
              id="edit-alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={120}
              placeholder="Nama singkat yang biasa digunakan"
              className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#111827]">NIP</label>
            <input value={dosen.nip} disabled className="h-11 w-full rounded-[10px] bg-[#F1F3F5] px-4 text-sm font-semibold text-[#6B7280]" />
          </div>

          {error && <p className="text-xs text-[#DC2626]">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
              Batal
            </button>
            <button type="submit" disabled={!berubah || loading} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}