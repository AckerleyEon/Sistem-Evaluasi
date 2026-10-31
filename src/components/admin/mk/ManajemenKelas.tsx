"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buatKelasMK, ubahPengampuKelas } from "@/lib/actions/pendaftaran";
import type { DosenOpsi, KelasItem, MkItem } from "./tipe";

export function ManajemenKelas({
  mk,
  kelas,
  dosen,
}: {
  mk: MkItem;
  kelas: KelasItem[];
  dosen: DosenOpsi[];
}) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [dosenId, setDosenId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function tambah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const hasil = await buatKelasMK(mk.id, nama, dosenId);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    setNama("");
    setDosenId("");
    router.refresh();
  }

  async function pilihPengampu(kelasId: string, dosenId: string) {
    setError("");
    const hasil = await ubahPengampuKelas(kelasId, dosenId);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mb-5 rounded-xl border border-[#E8EAEE] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Pembagian Kelas &amp; Pengampu</h3>
          <p className="text-xs text-[#6B7280]">Setiap kelas memiliki mahasiswa dan pengampu masing-masing.</p>
        </div>
        <span className="rounded-full bg-[#EEF3FD] px-2.5 py-1 text-xs font-semibold text-[#2F6BE8]">{kelas.length} kelas</span>
      </div>

      {kelas.length > 0 && (
        <ul className="mb-3 divide-y divide-[#F1F3F5] rounded-lg border border-[#E8EAEE]">
          {kelas.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <span className="min-w-20 text-sm font-semibold text-[#111827]">{item.nama}</span>
              <span className="text-xs text-[#6B7280]">{item.jumlahMhs} mahasiswa</span>
              <label className="ml-auto flex items-center gap-2 text-xs text-[#6B7280]">
                Pengampu
                <select
                  value={item.dosenId ?? ""}
                  onChange={(e) => void pilihPengampu(item.id, e.target.value)}
                  className="h-9 max-w-56 rounded-lg bg-[#EEF3FD] px-2 text-xs text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
                >
                  {dosen.map((d) => (
                    <option key={d.id} value={d.id}>{d.nama}{d.gelar ? `, ${d.gelar}` : ""}</option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={tambah} className="flex flex-wrap gap-2">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          maxLength={40}
          placeholder="Nama kelas baru, contoh: A"
          aria-label="Nama kelas baru"
          className="h-10 min-w-48 flex-1 rounded-lg bg-[#EEF3FD] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
        />
        <select
          value={dosenId}
          onChange={(e) => setDosenId(e.target.value)}
          required
          aria-label="Pilih pengampu kelas"
          className="h-10 min-w-48 rounded-lg bg-[#EEF3FD] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
        >
          <option value="" disabled>Pilih pengampu</option>
          {dosen.map((item) => <option key={item.id} value={item.id}>{item.nama}{item.gelar ? `, ${item.gelar}` : ""}</option>)}
        </select>
        <button type="submit" disabled={!nama.trim() || !dosenId || loading} className="h-10 rounded-lg bg-[#2F6BE8] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Menyimpan…" : "Tambah Kelas"}
        </button>
      </form>
      {kelas.length === 0 && <p className="mt-2 text-xs text-[#B45309]">Mata kuliah ini belum memiliki kelas.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-[#DC2626]">{error}</p>}
    </section>
  );
}
