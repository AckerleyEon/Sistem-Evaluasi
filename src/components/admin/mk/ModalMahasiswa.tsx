"use client";

import { useState } from "react";
import {
  tambahMahasiswaKeKelas,
  updateMahasiswa,
  hapusDariKelas,
  pindahKelas,
} from "@/lib/actions/pendaftaran";
import { ModalShell } from "./ModalShell";
import type { MkItem, MhsItem } from "./tipe";

const kelasInput =
  "h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40";

export function ModalTambahMahasiswa({
  mk,
  taLabel,
  onTutup,
  onBerhasil,
}: {
  mk: MkItem;
  taLabel: string;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{12}$/.test(nim.trim())) {
      setError("NIM harus 12 digit angka.");
      return;
    }
    if (nama.trim().length < 3) {
      setError("Nama mahasiswa minimal 3 karakter.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("nim", nim);
    fd.set("nama", nama);
    const hasil = await tambahMahasiswaKeKelas(mk.id, fd);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(hasil.pesan ?? "Mahasiswa ditambahkan");
  }

  return (
    <ModalShell onTutup={onTutup}>
      <h2 className="text-base font-bold text-[#111827]">Tambah Mahasiswa</h2>
      <p className="mb-4 text-[13px] text-[#6B7280]">
        {mk.kode} • {mk.nama} (T.A. {taLabel}). Jika NIM sudah ada di sistem, mahasiswanya langsung didaftarkan ke kelas.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tm-nim" className="mb-2 block text-[13px] font-medium text-[#111827]">NIM (12 digit)</label>
          <input id="tm-nim" value={nim} onChange={(e) => setNim(e.target.value)} inputMode="numeric" autoComplete="off" autoFocus placeholder="230431100073" className={kelasInput} />
        </div>
        <div>
          <label htmlFor="tm-nama" className="mb-2 block text-[13px] font-medium text-[#111827]">Nama Mahasiswa</label>
          <input id="tm-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap mahasiswa" className={kelasInput} />
        </div>
        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">Batal</button>
          <button type="submit" disabled={loading} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Menyimpan…" : "Tambahkan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalEditMahasiswa({
  mhs,
  onTutup,
  onBerhasil,
}: {
  mhs: MhsItem;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [nim, setNim] = useState(mhs.nim);
  const [nama, setNama] = useState(mhs.nama);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const berubah = nim.trim() !== mhs.nim || nama.trim() !== mhs.nama;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{12}$/.test(nim.trim())) {
      setError("NIM harus 12 digit angka.");
      return;
    }
    if (nama.trim().length < 3 || nama.trim().length > 100) {
      setError("Nama mahasiswa harus 3-100 karakter.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("nim", nim);
    fd.set("nama", nama);
    const hasil = await updateMahasiswa(mhs.id, fd);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(hasil.pesan ?? "Data mahasiswa diperbarui");
  }

  return (
    <ModalShell onTutup={onTutup}>
      <h2 className="text-base font-bold text-[#111827]">Edit Data Mahasiswa</h2>
      <p className="mb-4 text-[13px] text-[#6B7280]">Perubahan berlaku di semua kelas yang diikuti mahasiswa ini.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="em-nama" className="mb-2 block text-[13px] font-medium text-[#111827]">Nama Mahasiswa</label>
          <input id="em-nama" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus className={kelasInput} />
        </div>
        <div>
          <label htmlFor="em-nim" className="mb-2 block text-[13px] font-medium text-[#111827]">NIM (12 digit)</label>
          <input id="em-nim" value={nim} onChange={(e) => setNim(e.target.value)} inputMode="numeric" className={kelasInput} />
        </div>
        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">Batal</button>
          <button type="submit" disabled={!berubah || loading} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalHapusDariKelas({
  mk,
  taLabel,
  mhs,
  jumlahNilai,
  onTutup,
  onBerhasil,
}: {
  mk: MkItem;
  taLabel: string;
  mhs: MhsItem;
  jumlahNilai: number | null;
  onTutup: () => void;
  onBerhasil: (nilaiTerhapus: number) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function konfirmasi() {
    setError("");
    setLoading(true);
    const hasil = await hapusDariKelas(mk.id, mhs.id);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(hasil.nilaiTerhapus ?? 0);
  }

  return (
    <ModalShell onTutup={onTutup} alert>
      <h2 className="mb-2 text-base font-bold text-[#111827]">Hapus dari kelas?</h2>
      <p className="mb-3 text-sm text-[#6B7280]" style={{ overflowWrap: "anywhere" }}>
        <span className="font-semibold text-[#111827]">{mhs.nama}</span> ({mhs.nim}) akan dikeluarkan dari {mk.kode} •{" "}
        {mk.nama} (T.A. {taLabel}). Data akun mahasiswa tidak dihapus.
      </p>

      {jumlahNilai === null && <p className="mb-4 text-sm text-[#6B7280]">Memeriksa nilai terkait…</p>}
      {jumlahNilai !== null && jumlahNilai > 0 && (
        <div className="mb-4 rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
          Mahasiswa ini punya {jumlahNilai} nilai di mata kuliah ini. Nilai tersebut ikut terhapus dan tidak bisa diurungkan.
        </div>
      )}

      {error && <p className="mb-3 text-xs font-medium text-[#DC2626]">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button autoFocus onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">Batal</button>
        <button
          onClick={konfirmasi}
          disabled={jumlahNilai === null || loading}
          className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#B91C1C]"
        >
          {loading ? "Menghapus…" : "Hapus dari Kelas"}
        </button>
      </div>
    </ModalShell>
  );
}

export function ModalPindahKelas({
  mk,
  mhs,
  jumlahNilai,
  daftarMK,
  onTutup,
  onBerhasil,
}: {
  mk: MkItem;
  mhs: MhsItem;
  jumlahNilai: number | null;
  daftarMK: MkItem[];
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [cari, setCari] = useState("");
  const [tujuanId, setTujuanId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pilihan = daftarMK.filter(
    (m) =>
      m.id !== mk.id &&
      (m.kode.toLowerCase().includes(cari.toLowerCase()) || m.nama.toLowerCase().includes(cari.toLowerCase()))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const hasil = await pindahKelas(mk.id, mhs.id, tujuanId);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(`${mhs.nama} dipindahkan ke ${hasil.pesan ?? "kelas tujuan"}`);
  }

  return (
    <ModalShell onTutup={onTutup}>
      <h2 className="text-base font-bold text-[#111827]">Pindah Kelas</h2>
      <p className="mb-4 text-[13px] text-[#6B7280]" style={{ overflowWrap: "anywhere" }}>
        {mhs.nama} ({mhs.nim}) dari {mk.kode} • {mk.nama}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari kode atau nama mata kuliah tujuan..."
          autoFocus
          className={kelasInput}
        />
        <ul className="max-h-48 overflow-y-auto rounded-[10px] border border-[#E8EAEE]">
          {pilihan.length === 0 && <li className="px-4 py-4 text-center text-xs text-[#6B7280]">Mata kuliah tidak ditemukan.</li>}
          {pilihan.map((m) => (
            <li key={m.id} className="border-b border-[#F1F3F5] last:border-0">
              <button
                type="button"
                onClick={() => setTujuanId(m.id)}
                aria-pressed={m.id === tujuanId}
                className={`block w-full px-4 py-2.5 text-left text-sm ${
                  m.id === tujuanId ? "bg-[#EEF3FD] font-semibold text-[#2F6BE8]" : "text-[#111827] [@media(hover:hover)]:hover:bg-[#F8FAFF]"
                }`}
              >
                {m.kode} • {m.nama}
              </button>
            </li>
          ))}
        </ul>

        {jumlahNilai !== null && jumlahNilai > 0 && (
          <div className="rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
            Mahasiswa ini punya {jumlahNilai} nilai di {mk.kode}. Nilai tersebut ikut terhapus saat dipindahkan.
          </div>
        )}
        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">Batal</button>
          <button
            type="submit"
            disabled={!tujuanId || jumlahNilai === null || loading}
            className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memindahkan…" : "Pindahkan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}