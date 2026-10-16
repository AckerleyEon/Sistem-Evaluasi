"use client";

import { useState } from "react";
import { createMataKuliah, updateMataKuliah, hapusMataKuliah } from "@/lib/actions/mata-kuliah";
import { namaDenganGelar } from "@/lib/dosen";
import { ModalShell } from "./ModalShell";
import type { MkItem, DosenOpsi, Dampak } from "./tipe";

const POLA_KODE = /^[A-Z]{2,4}\d{2,4}$/;

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");
}

const kelasInput =
  "h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40 disabled:cursor-not-allowed disabled:text-[#6B7280]";

export function ModalMK({
  mk,
  daftarDosen,
  taLabel,
  onTutup,
  onBerhasil,
}: {
  mk: MkItem | null; // null = mode tambah
  daftarDosen: DosenOpsi[];
  taLabel: string;
  onTutup: () => void;
  onBerhasil: (pesan: string, idBaru?: string) => void;
}) {
  const [kode, setKode] = useState(mk?.kode ?? "");
  const [nama, setNama] = useState(mk?.nama ?? "");
  const [sks, setSks] = useState(String(mk?.sks ?? 3));
  const [dosenId, setDosenId] = useState(mk?.pjmkId ?? "");
  const [pilihDosen, setPilihDosen] = useState(false);
  const [cariDosen, setCariDosen] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const kodeTerkunci = mk?.terpakai ?? false;
  const dosenTerpilih = daftarDosen.find((d) => d.id === dosenId);

  const adaPerubahan = mk
    ? kode.trim().toUpperCase() !== mk.kode ||
      nama.trim() !== mk.nama ||
      Number(sks) !== mk.sks ||
      dosenId !== (mk.pjmkId ?? "")
    : kode.trim() !== "" || nama.trim() !== "" || dosenId !== "";
  const wajibTerisi = kode.trim() !== "" && nama.trim() !== "" && dosenId !== "";
  const bolehSimpan = wajibTerisi && (mk ? adaPerubahan : true) && !loading;

  const dosenTersaring = daftarDosen.filter((d) => {
    const kata = cariDosen.toLowerCase();
    return (
      d.nama.toLowerCase().includes(kata) || (d.gelar ?? "").toLowerCase().includes(kata) || d.nip.includes(kata)
    );
  });

  function tutup() {
    if (adaPerubahan && !window.confirm("Buang perubahan yang belum disimpan?")) return;
    onTutup();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const kodeBaku = kode.trim().toUpperCase();
    if (!POLA_KODE.test(kodeBaku)) {
      setError("Kode harus huruf kapital diikuti angka, contoh TE201.");
      return;
    }
    if (nama.trim().length < 3) {
      setError("Nama mata kuliah minimal 3 karakter.");
      return;
    }
    if (!dosenId) {
      setError("Dosen koordinator pengampu (PJMK) wajib dipilih.");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("kode", kodeBaku);
    fd.set("nama", nama);
    fd.set("sks", sks);
    fd.set("dosenId", dosenId);
    const hasil = mk ? await updateMataKuliah(mk.id, fd) : await createMataKuliah(fd);
    setLoading(false);

    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(mk ? `${kodeBaku} berhasil diperbarui` : `${kodeBaku} berhasil ditambahkan`, hasil.id);
  }

  return (
    <ModalShell onTutup={tutup} lebar="max-w-lg">
      <h2 className="text-base font-bold text-[#111827]">{mk ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}</h2>
      <p className="mb-5 text-[13px] text-[#6B7280]">
        {mk ? `Ubah data pokok mata kuliah ${mk.kode}` : "Kelola data pokok kurikulum mata kuliah Program Studi Teknik Elektro"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mk-kode" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Kode Mata Kuliah *
          </label>
          <div className="relative">
            <input
              id="mk-kode"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              disabled={kodeTerkunci}
              placeholder="TE201"
              autoFocus={!kodeTerkunci}
              title={kodeTerkunci ? "Kode terkunci karena mata kuliah sudah dipakai" : undefined}
              className={kelasInput}
            />
            {kodeTerkunci && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            )}
          </div>
          {kodeTerkunci && (
            <p className="mt-1.5 text-xs text-[#6B7280]">
              Kode terkunci karena sudah dipakai (mahasiswa, CPMK, atau tugas).
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mk-nama" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Nama Mata Kuliah Lengkap *
          </label>
          <input
            id="mk-nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Rangkaian Listrik"
            className={kelasInput}
          />
        </div>

        <div>
          <label htmlFor="mk-sks" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Bobot SKS *
          </label>
          <select id="mk-sks" value={sks} onChange={(e) => setSks(e.target.value)} className={kelasInput}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} SKS
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#111827]">Dosen Koordinator Pengampu (PJMK) *</span>
            <span className="text-xs text-[#6B7280]">T.A. {taLabel}</span>
          </div>

          {dosenTerpilih && !pilihDosen ? (
            <div className="flex items-center gap-3 rounded-[10px] bg-[#EEF3FD] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F6BE8] text-xs font-semibold text-white">
                {inisial(dosenTerpilih.nama)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#111827]">
                  {namaDenganGelar(dosenTerpilih)}
                </span>
                <span className="block text-xs text-[#6B7280]">NIP. {dosenTerpilih.nip}</span>
              </span>
              <button
                type="button"
                onClick={() => setPilihDosen(true)}
                className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2F6BE8]"
              >
                Ganti PJMK
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] bg-[#EEF3FD] p-2">
              <input
                value={cariDosen}
                onChange={(e) => setCariDosen(e.target.value)}
                placeholder="Cari nama atau NIP dosen..."
                className="h-10 w-full rounded-lg bg-white px-3 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2]"
              />
              <ul className="mt-2 max-h-40 overflow-y-auto">
                {dosenTersaring.length === 0 && (
                  <li className="px-3 py-3 text-center text-xs text-[#6B7280]">Dosen tidak ditemukan.</li>
                )}
                {dosenTersaring.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDosenId(d.id);
                        setPilihDosen(false);
                        setCariDosen("");
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm [@media(hover:hover)]:hover:bg-white ${
                        d.id === dosenId ? "font-semibold text-[#2F6BE8]" : "text-[#111827]"
                      }`}
                    >
                      {namaDenganGelar(d)}
                      <span className="block text-xs font-normal text-[#6B7280]">NIP. {d.nip}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={tutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
            Batal
          </button>
          <button
            type="submit"
            disabled={!bolehSimpan}
            className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan…" : mk ? "Simpan Perubahan" : "Simpan Mata Kuliah"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalHapusMK({
  mk,
  dampak,
  onTutup,
  onBerhasil,
}: {
  mk: MkItem;
  dampak: Dampak | null;
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const memeriksa = dampak === null;
  const terblokir = dampak !== null && (dampak.cpmk > 0 || dampak.tugas > 0);
  const cocok = konfirmasi.trim().toUpperCase() === mk.kode;

  async function konfirmasiHapus() {
    setError("");
    setLoading(true);
    const hasil = await hapusMataKuliah(mk.id, konfirmasi);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(`Mata kuliah ${mk.kode} dihapus`);
  }

  return (
    <ModalShell onTutup={onTutup} alert>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#111827]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3L2 20h20L12 3Z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
        Hapus Mata Kuliah?
      </h2>

      <p className="text-sm text-[#6B7280]">Anda akan menghapus:</p>
      <p className="mb-3 text-sm font-semibold text-[#111827]" style={{ overflowWrap: "anywhere" }}>
        {mk.kode} • {mk.nama}
      </p>

      {memeriksa && <p className="mb-4 text-sm text-[#6B7280]">Memeriksa data terkait…</p>}

      {terblokir && (
        <div className="mb-4 rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
          Mata kuliah ini sudah punya {dampak.cpmk} CPMK dan {dampak.tugas} tugas penilaian (beserta nilai terkait),
          jadi tidak bisa dihapus. Hapus data itu lebih dulu bila memang perlu.
        </div>
      )}

      {dampak !== null && !terblokir && (
        <div className="mb-4 text-sm text-[#6B7280]">
          <p>Data berikut ikut terhapus:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[#111827]">
            <li>{dampak.pendaftaran} pendaftaran mahasiswa (semua T.A.)</li>
            <li>{dampak.penugasan} penugasan dosen pengampu</li>
          </ul>
        </div>
      )}

      {!terblokir && (
        <div className="mb-4">
          <label htmlFor="konfirmasi-kode" className="mb-2 block text-[13px] text-[#111827]">
            Ketik <span className="font-bold">{mk.kode}</span> untuk mengonfirmasi
          </label>
          <input
            id="konfirmasi-kode"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            autoComplete="off"
            className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#DC2626]/40"
          />
        </div>
      )}

      {error && <p className="mb-3 text-xs font-medium text-[#DC2626]">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button autoFocus onClick={onTutup} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
          Batal
        </button>
        <button
          onClick={konfirmasiHapus}
          disabled={memeriksa || terblokir || !cocok || loading}
          className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#B91C1C]"
        >
          {loading ? "Menghapus…" : "Hapus Mata Kuliah"}
        </button>
      </div>
    </ModalShell>
  );
}