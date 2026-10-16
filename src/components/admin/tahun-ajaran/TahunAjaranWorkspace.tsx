"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTahunAjaran,
  aktifkanTahunAjaran,
  deleteTahunAjaran,
  hitungDataTerkaitTahunAjaran,
} from "@/lib/actions/tahun-ajaran";

type TahunAjaranItem = { id: string; label: string; status: "AKTIF" | "ARSIP" };

export function TahunAjaranWorkspace({ daftarAwal }: { daftarAwal: TahunAjaranItem[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [dialogTarget, setDialogTarget] = useState<TahunAjaranItem | null>(null);
  const [jumlahTerkait, setJumlahTerkait] = useState<number | null>(null);
  const [loadingAksi, setLoadingAksi] = useState(false);

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm("");
    const fd = new FormData();
    fd.set("label", label);
    const hasil = await createTahunAjaran(fd);
    if (hasil?.error) {
      setErrorForm(hasil.error);
      return;
    }
    setLabel("");
    router.refresh();
  }

  async function handleAktifkan(id: string) {
    setLoadingAksi(true);
    await aktifkanTahunAjaran(id);
    setLoadingAksi(false);
    router.refresh();
  }

  async function bukaDialogHapus(item: TahunAjaranItem) {
    setDialogTarget(item);
    setJumlahTerkait(null);
    const jumlah = await hitungDataTerkaitTahunAjaran(item.id);
    setJumlahTerkait(jumlah);
  }

  async function konfirmasiHapus() {
    if (!dialogTarget) return;
    const fd = new FormData();
    fd.set("id", dialogTarget.id);
    const hasil = await deleteTahunAjaran(fd);
    setDialogTarget(null);
    if (!hasil?.error) router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[358px_minmax(0,1fr)] lg:items-start">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h2 className="text-lg font-bold text-[#111827]">Tambah Tahun Ajaran</h2>
        <p className="mb-5 text-[13px] text-[#6B7280]">Tahun ajaran baru belum aktif — aktifkan manual dari daftar.</p>
        <form onSubmit={handleTambah} className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#111827]">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2025/2026"
              className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
            />
            {errorForm && <p className="mt-1.5 text-xs text-[#DC2626]">{errorForm}</p>}
          </div>
          <button type="submit" className="h-11 w-full rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white">
            Tambah
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="border-b border-[#E8EAEE] px-6 py-4">
          <h1 className="text-lg font-bold text-[#111827]">Daftar Tahun Ajaran</h1>
        </div>
        {daftarAwal.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#6B7280]">Belum ada Tahun Ajaran.</div>
        ) : (
          daftarAwal.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-[#E8EAEE] px-6 py-4 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#111827]">{item.label}</span>
                {item.status === "AKTIF" ? (
                  <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">Aktif</span>
                ) : (
                  <span className="rounded-full bg-[#F1F3F5] px-2.5 py-0.5 text-xs font-semibold text-[#6B7280]">Arsip</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {item.status !== "AKTIF" && (
                  <button onClick={() => handleAktifkan(item.id)} disabled={loadingAksi} className="text-sm font-semibold text-[#2F6BE8] disabled:opacity-50">
                    Aktifkan
                  </button>
                )}
                <button onClick={() => bukaDialogHapus(item)} className="text-sm font-semibold text-[#DC2626]">
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {dialogTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-2 text-base font-bold text-[#111827]">Hapus Tahun Ajaran {dialogTarget.label}?</h2>
            <p className="mb-5 text-sm text-[#6B7280]">
              {jumlahTerkait === null
                ? "Memeriksa data terkait…"
                : jumlahTerkait > 0
                ? `Tahun ajaran ini punya ${jumlahTerkait} data terkait (CPMK, Sub-CPMK, Tugas, Nilai, dll). Menghapusnya akan menghapus SEMUA data itu juga, tidak bisa dibatalkan.`
                : "Tahun ajaran ini belum punya data terkait."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDialogTarget(null)} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
                Batal
              </button>
              <button onClick={konfirmasiHapus} className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}