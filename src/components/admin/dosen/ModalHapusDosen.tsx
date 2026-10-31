"use client";

import { useState } from "react";
import { deleteDosen } from "@/lib/actions/dosen";
import { namaDenganGelar } from "@/lib/dosen";
import type { DosenItem } from "./DosenWorkspace";

export function ModalHapusDosen({
  dosen,
  penugasan,
  onTutup,
  onBerhasil,
}: {
  dosen: DosenItem;
  penugasan: string[] | null;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const memeriksa = penugasan === null;
  const adaPenugasan = penugasan !== null && penugasan.length > 0;
  const nama = namaDenganGelar(dosen);

  async function konfirmasi() {
    setError("");
    setLoading(true);
    const hasil = await deleteDosen(dosen.id);
    setLoading(false);

    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(`Akun ${dosen.nama} berhasil dihapus`);
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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h2 className="mb-2 text-base font-bold text-[#111827]" style={{ overflowWrap: "anywhere" }}>
          Hapus akun {nama}?
        </h2>

        {memeriksa && <p className="mb-5 text-sm text-[#6B7280]">Memeriksa kelas yang diampu…</p>}

        {adaPenugasan && (
          <div className="mb-5 space-y-2 text-sm text-[#6B7280]">
            <p>Dosen ini masih mengampu kelas berikut:</p>
            <ul className="list-disc space-y-0.5 pl-5 text-[#111827]">
              {penugasan.slice(0, 4).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {penugasan.length > 4 && <li className="list-none text-[#6B7280]">dan {penugasan.length - 4} lainnya</li>}
            </ul>
            <p>Ganti pengampu kelas terlebih dahulu sebelum menghapus akun ini.</p>
          </div>
        )}

        {!adaPenugasan && penugasan !== null && (
          <p className="mb-5 text-sm text-[#6B7280]">
            Akun login dengan NIP {dosen.nip} ikut dihapus. Tindakan ini tidak bisa dibatalkan.
          </p>
        )}
        {adaPenugasan && (
          <p className="mb-5 text-sm text-[#6B7280]">
            Akun login dengan NIP {dosen.nip} ikut dihapus. Tindakan ini tidak bisa dibatalkan.
          </p>
        )}

        {error && <p className="mb-3 text-xs text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            autoFocus
            onClick={onTutup}
            className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]"
          >
            Batal
          </button>
          <button
            onClick={konfirmasi}
            disabled={memeriksa || adaPenugasan || loading}
            className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}