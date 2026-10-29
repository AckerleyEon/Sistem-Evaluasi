"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cekDampakHapusMK } from "@/lib/actions/mata-kuliah";
import { cekNilaiMahasiswaDiMK, pindahMahasiswaAntarKelas, urungkanHapusDariKelas } from "@/lib/actions/pendaftaran";
import { DaftarMK } from "./DaftarMK";
import { PanelMK } from "./PanelMK";
import { ModalMK, ModalHapusMK } from "./ModalMK";
import { TombolImporMK } from "@/components/admin/mk/ModalImporMK";
import { ModalImporMahasiswa } from "@/components/admin/mk/ModalImporMahasiswa";
import { TombolImporMahasiswaMassal } from "@/components/admin/mk/ModalImporMahasiswaMassal";

import {
  ModalTambahMahasiswa,
  ModalEditMahasiswa,
  ModalHapusDariKelas,
  ModalPindahKelas,
} from "./ModalMahasiswa";
import type { MkItem, DosenOpsi, MhsItem, Dampak } from "./tipe";

const HALAMAN = "/admin/data-master/mata-kuliah";

type ToastState = { pesan: string; aksi?: { label: string; jalankan: () => void | Promise<void> } } | null;

export function MkWorkspace({
  ta,
  daftarMK,
  daftarDosen,
  daftarCPL,
  selectedId,
  selectedKelasId,
  mahasiswa,
  q,
  page,
  totalHalaman,
  totalHasil,
  pageSize,
  stats,
}: {
  ta: { id: string; label: string };
  daftarMK: MkItem[];
  daftarDosen: DosenOpsi[];
  daftarCPL: { id: string; kode: string }[];
  selectedId: string | null;
  selectedKelasId: string | null;
  mahasiswa: MhsItem[];
  q: string;
  page: number;
  totalHalaman: number;
  totalHasil: number;
  pageSize: number;
  stats: { totalMK: number; totalSks: number; mahasiswaTerdaftar: number; totalPendaftaran: number };
}) {
  const router = useRouter();
  const selected = daftarMK.find((m) => m.id === selectedId) ?? null;

  const [modalMk, setModalMk] = useState<{ mk: MkItem | null } | null>(null);
  const [hapusMk, setHapusMk] = useState<{ mk: MkItem; dampak: Dampak | null } | null>(null);
  const [tambahMhs, setTambahMhs] = useState(false);
  const [imporMhs, setImporMhs] = useState(false);
  const [editMhs, setEditMhs] = useState<MhsItem | null>(null);
  const [hapusKelas, setHapusKelas] = useState<{ mhs: MhsItem; jumlahNilai: number | null } | null>(null);
  const [pindah, setPindah] = useState<{ mhs: MhsItem; jumlahNilai: number | null } | null>(null);

  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tampilToast(pesan: string, aksi?: NonNullable<ToastState>["aksi"], durasi = 4000) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ pesan, aksi });
    timerRef.current = setTimeout(() => setToast(null), durasi);
  }

  async function bukaHapusMk(m: MkItem) {
    setHapusMk({ mk: m, dampak: null });
    const dampak = await cekDampakHapusMK(m.id);
    setHapusMk((prev) => (prev && prev.mk.id === m.id ? { mk: m, dampak } : prev));
  }

  async function bukaHapusKelas(m: MhsItem) {
    if (!selected) return;
    setHapusKelas({ mhs: m, jumlahNilai: null });
    const jumlahNilai = await cekNilaiMahasiswaDiMK(selected.id, m.id);
    setHapusKelas((prev) => (prev && prev.mhs.id === m.id ? { mhs: m, jumlahNilai } : prev));
  }

  async function ubahKelasMahasiswa(m: MhsItem, kelasId: string) {
    if (!selected) return;
    const hasil = await pindahMahasiswaAntarKelas(selected.id, m.id, kelasId);
    if (hasil.error) {
      tampilToast(hasil.error);
      return;
    }
    tampilToast(hasil.pesan ?? "Kelas mahasiswa diperbarui.");
    router.refresh();
  }

  async function bukaPindah(m: MhsItem) {
    if (!selected) return;
    setPindah({ mhs: m, jumlahNilai: null });
    const jumlahNilai = await cekNilaiMahasiswaDiMK(selected.id, m.id);
    setPindah((prev) => (prev && prev.mhs.id === m.id ? { mhs: m, jumlahNilai } : prev));
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div role="status" className="fixed right-5 top-20 z-50 flex items-center gap-3 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-medium text-white shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <span>{toast.pesan}</span>
          {toast.aksi && (
            <button
              onClick={async () => {
                const aksi = toast.aksi;
                setToast(null);
                await aksi?.jalankan();
              }}
              className="font-bold underline"
            >
              {toast.aksi.label}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-160">
          <span className="mb-2 inline-block rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8]">
            T.A. {ta.label}
          </span>
          <h1 className="text-lg font-bold leading-6.5 text-[#111827]">Data Master Mata Kuliah &amp; Enrollment Mahasiswa</h1>
          <p className="text-[13px] text-[#6B7280]">
            Konfigurasi kurikulum aktif, alokasi dosen pengampu, bobot SKS, serta manajemen mahasiswa yang terdaftar pada
            masing-masing kelas mata kuliah.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <div className="flex flex-row gap-2 sm:flex-col lg:flex-row">
          <button onClick={() => setModalMk({ mk: null })} className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]">
            <span className="text-lg leading-none">+</span> Tambah Mata Kuliah Baru
          </button>
          <TombolImporMK />
          </div>
          <TombolImporMahasiswaMassal
            onBerhasil={(pesan) => {
              tampilToast(pesan);
              router.refresh();
            }}
          />
        </div>
      </div>
<div className="grid min-h-0 items-stretch gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
  <DaftarMK
    daftarMK={daftarMK}
    selectedId={selectedId}
    onEdit={(m) => setModalMk({ mk: m })}
    onHapus={bukaHapusMk}
  />


          <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div>
                <p className="text-xs text-[#6B7280]">Total Mata Kuliah</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold leading-10 text-[#111827]">{stats.totalMK}</span>
                  <span className="text-xs font-semibold text-[#2F6BE8]">{stats.totalSks} SKS Total</span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF3FD]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
                  <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div>
                <p className="text-xs text-[#6B7280]">Mahasiswa Terdaftar</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold leading-10 text-[#111827]">{stats.mahasiswaTerdaftar}</span>
                  <span className="text-xs font-semibold text-[#2F6BE8]">{stats.totalPendaftaran} pendaftaran</span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF3FD]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3.5 19c0-3 2.5-5.3 5.5-5.3S14.5 16 14.5 19" />
                  <path d="M16 8.3a3 3 0 1 1 1.5 5.6" />
                  <path d="M15.5 13.7c2.5.3 4.5 2.4 4.5 5.3" />
                </svg>
              </div>
            </div>
          </div>

          {selected ? (
            <PanelMK
              key={selected.id}
              mk={selected}
              taLabel={ta.label}
              mahasiswa={mahasiswa}
              dosen={daftarDosen}
              kelasId={selectedKelasId}
              q={q}
              page={page}
              totalHalaman={totalHalaman}
              totalHasil={totalHasil}
              pageSize={pageSize}
              onTambahMhs={() => setTambahMhs(true)}
              onImporMhs={() => setImporMhs(true)}
              onEditMhs={setEditMhs}
              onHapusKelas={bukaHapusKelas}
              onPindah={bukaPindah}
              onUbahKelas={ubahKelasMahasiswa}
            />
          ) : (
            <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <p className="mb-1 text-base font-bold text-[#111827]">Belum ada mata kuliah</p>
              <p className="text-sm text-[#6B7280]">Gunakan tombol “Tambah Mata Kuliah Baru” di bagian atas untuk mulai mengelola kelas dan mahasiswa.</p>
            </div>
          )}
        </div>
      </div>

      {modalMk && (
        <ModalMK
          key={modalMk.mk?.id ?? "baru"}
          mk={modalMk.mk}
          daftarDosen={daftarDosen}
          daftarCPL={daftarCPL}
          taLabel={ta.label}
          onTutup={() => setModalMk(null)}
          onBerhasil={(pesan, idBaru) => {
            setModalMk(null);
            tampilToast(pesan);
            if (idBaru) router.push(`${HALAMAN}?mk=${idBaru}`);
          }}
        />
      )}

      {hapusMk && (
        <ModalHapusMK
          key={hapusMk.mk.id}
          mk={hapusMk.mk}
          dampak={hapusMk.dampak}
          onTutup={() => setHapusMk(null)}
          onBerhasil={(pesan) => {
            setHapusMk(null);
            tampilToast(pesan);
            router.push(HALAMAN);
          }}
        />
      )}

      {tambahMhs && selected && (
        <ModalTambahMahasiswa
          mk={selected}
          taLabel={ta.label}
          kelasId={selectedKelasId}
          kelasNama={selected.kelas.find((kelas) => kelas.id === selectedKelasId)?.nama ?? null}
          onTutup={() => setTambahMhs(false)}
          onBerhasil={(pesan) => {
            setTambahMhs(false);
            tampilToast(pesan);
          }}
        />
      )}

      {imporMhs && selected && (
        <ModalImporMahasiswa
          key={selected.id}
          mk={selected}
          taLabel={ta.label}
          onTutup={() => setImporMhs(false)}
          onBerhasil={(pesan) => {
            tampilToast(pesan);
            router.refresh();
          }}
        />
      )}

      {editMhs && (
        <ModalEditMahasiswa
          key={editMhs.id}
          mhs={editMhs}
          onTutup={() => setEditMhs(null)}
          onBerhasil={(pesan) => {
            setEditMhs(null);
            tampilToast(pesan);
          }}
        />
      )}

      {hapusKelas && selected && (
        <ModalHapusDariKelas
          key={hapusKelas.mhs.id}
          mk={selected}
          taLabel={ta.label}
          mhs={hapusKelas.mhs}
          jumlahNilai={hapusKelas.jumlahNilai}
          onTutup={() => setHapusKelas(null)}
          onBerhasil={(nilaiTerhapus) => {
            const mhs = hapusKelas.mhs;
            const mkId = selected.id;
            setHapusKelas(null);
            if (nilaiTerhapus === 0) {
              tampilToast(
                `${mhs.nama} dikeluarkan dari ${selected.kode}`,
                {
                  label: "Urungkan",
                  jalankan: async () => {
                    const hasil = await urungkanHapusDariKelas(mkId, mhs.id, mhs.kelasId);
                    if (hasil.error) {
                      tampilToast(hasil.error);
                      return;
                    }
                    tampilToast(`${mhs.nama} dikembalikan ke kelas`);
                    router.refresh();
                  },
                },
                6000
              );
            } else {
              tampilToast(`${mhs.nama} dikeluarkan dari ${selected.kode} (nilai terkait ikut terhapus)`);
            }
          }}
        />
      )}

      {pindah && selected && (
        <ModalPindahKelas
          key={pindah.mhs.id}
          mk={selected}
          mhs={pindah.mhs}
          jumlahNilai={pindah.jumlahNilai}
          daftarMK={daftarMK}
          onTutup={() => setPindah(null)}
          onBerhasil={(pesan) => {
            setPindah(null);
            tampilToast(pesan);
          }}
        />
      )}
    </div>
  );
}