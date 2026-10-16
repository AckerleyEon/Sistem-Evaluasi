"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  aktifkanTahunAjaran,
  createTahunAjaran,
  deleteTahunAjaran,
  hitungDataTerkaitTahunAjaran,
} from "@/lib/actions/tahun-ajaran";

type TahunAjaranItem = { id: string; label: string; status: "AKTIF" | "ARSIP" };
type ModeTambah = "kosong" | "salin";

export function AdminTopbar({
  username,
  daftarTahunAjaran,
  onMenuClick,
}: {
  username: string;
  daftarTahunAjaran: TahunAjaranItem[];
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [taOpen, setTaOpen] = useState(false);
  const [cari, setCari] = useState("");
  const [loadingAksi, setLoadingAksi] = useState(false);

  const [modalTambah, setModalTambah] = useState(false);
  const [labelBaru, setLabelBaru] = useState("");
  const [modeTambah, setModeTambah] = useState<ModeTambah>("kosong");
  const [sumberId, setSumberId] = useState("");
  const [errorTambah, setErrorTambah] = useState("");
  const [loadingTambah, setLoadingTambah] = useState(false);

  const [hapusTarget, setHapusTarget] = useState<TahunAjaranItem | null>(null);
  const [jumlahTerkait, setJumlahTerkait] = useState<number | null>(null);
  const [errorHapus, setErrorHapus] = useState("");
  const [loadingHapus, setLoadingHapus] = useState(false);

  const profilRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLDivElement>(null);

  const aktif = daftarTahunAjaran.find((ta) => ta.status === "AKTIF");
  const hasilCari = daftarTahunAjaran.filter((ta) => ta.label.toLowerCase().includes(cari.toLowerCase()));
  const adaTahunAjaran = daftarTahunAjaran.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profilRef.current && !profilRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (taRef.current && !taRef.current.contains(e.target as Node)) setTaOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function pilihTahunAjaran(ta: TahunAjaranItem) {
    if (ta.status === "AKTIF") {
      setTaOpen(false);
      return;
    }
    setLoadingAksi(true);
    await aktifkanTahunAjaran(ta.id);
    setLoadingAksi(false);
    setTaOpen(false);
    router.refresh();
  }

  function bukaModalTambah() {
    setLabelBaru("");
    setModeTambah("kosong");
    setSumberId(daftarTahunAjaran[0]?.id ?? "");
    setErrorTambah("");
    setModalTambah(true);
    setTaOpen(false);
  }

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setErrorTambah("");
    setLoadingTambah(true);
    const fd = new FormData();
    fd.set("label", labelBaru);
    fd.set("mode", modeTambah);
    if (modeTambah === "salin") fd.set("sumberId", sumberId);
    const hasil = await createTahunAjaran(fd);
    setLoadingTambah(false);
    if (hasil?.error) {
      setErrorTambah(hasil.error);
      return;
    }
    setModalTambah(false);
    router.refresh();
  }

  async function bukaDialogHapus(ta: TahunAjaranItem) {
    setTaOpen(false);
    setHapusTarget(ta);
    setJumlahTerkait(null);
    setErrorHapus("");
    setJumlahTerkait(await hitungDataTerkaitTahunAjaran(ta.id));
  }

  async function konfirmasiHapus() {
    if (!hapusTarget) return;
    setLoadingHapus(true);
    const fd = new FormData();
    fd.set("id", hapusTarget.id);
    const hasil = await deleteTahunAjaran(fd);
    setLoadingHapus(false);
    if (hasil?.error) {
      setErrorHapus(hasil.error);
      return;
    }
    setHapusTarget(null);
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between bg-white px-5 py-4 lg:px-6"
      style={{ borderBottom: "1px solid #E8EAEE", paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-[#111827] lg:hidden" aria-label="Buka menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold leading-7 text-[#111827]">Sistem Evaluasi CPL</h1>
            <span className="rounded-full bg-[#DCE7FB] px-2.5 py-0.5 text-xs font-semibold text-[#2F6BE8]">Prodi EE</span>
          </div>
          <p className="hidden text-[13px] text-[#6B7280] sm:block">Pemantauan performa real-time ketercapaian CPL</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dropdown Tahun Ajaran */}
        <div ref={taRef} className="relative">
          <button
            type="button"
            onClick={() => setTaOpen((v) => !v)}
            disabled={loadingAksi}
            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#2F6BE8] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" />
            </svg>
            {aktif ? `T.A. ${aktif.label}` : "Pilih T.A."}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {taOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-[#E8EAEE] bg-white shadow-[0_8px_24px_rgba(16,24,40,.12)]">
              <div className="p-3">
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4-4" />
                  </svg>
                  <input
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari T.A"
                    className="h-10 w-full rounded-full bg-[#F1F3F5] pl-10 pr-3 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto">
                {hasilCari.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[#6B7280]">Tidak ditemukan.</p>
                ) : (
                  hasilCari.map((ta) => (
                    <div key={ta.id} className="flex items-center border-b border-[#F1F3F5] last:border-0">
                      <button
                        onClick={() => pilihTahunAjaran(ta)}
                        className={`flex-1 py-3 pl-12 pr-2 text-center text-sm [@media(hover:hover)]:hover:bg-[#F8FAFF] ${
                          ta.status === "AKTIF" ? "font-semibold text-[#2F6BE8]" : "text-[#111827]"
                        }`}
                      >
                        {ta.label}
                      </button>
                      <button
                        onClick={() => bukaDialogHapus(ta)}
                        disabled={ta.status === "AKTIF"}
                        aria-label={`Hapus T.A. ${ta.label}`}
                        title={ta.status === "AKTIF" ? "T.A. aktif tidak bisa dihapus" : `Hapus T.A. ${ta.label}`}
                        className={`mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6B7280] ${
                          ta.status === "AKTIF"
                            ? "cursor-not-allowed opacity-30"
                            : "[@media(hover:hover)]:hover:bg-[#FEE2E2] [@media(hover:hover)]:hover:text-[#DC2626]"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3">
                <button onClick={bukaModalTambah} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#2F6BE8] text-sm font-semibold text-white">
                  <span className="text-base leading-none">+</span> Tambah T.A
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profil */}
        <div ref={profilRef} className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5" aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="hidden text-right sm:block">
              <span className="block max-w-40cate text-sm font-semibold text-[#111827]">{username}</span>
              <span className="block text-xs text-[#6B7280]">Administrator</span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6BE8] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
            </span>
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[#E8EAEE] bg-white py-1.5 shadow-[0_4px_16px_rgba(16,24,40,.08)]">
              <button role="menuitem" className="block w-full px-4 py-2 text-left text-sm text-[#111827] hover:bg-[#EEF3FD]">
                Profil
              </button>
              <button role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })} className="block w-full px-4 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEE2E2]">
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah T.A. */}
      {modalTambah &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6">
              <h2 className="mb-4 text-base font-bold text-[#111827]">Tambah Tahun Ajaran</h2>
              <form onSubmit={handleTambah} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#111827]">Label</label>
                  <input
                    value={labelBaru}
                    onChange={(e) => setLabelBaru(e.target.value)}
                    placeholder="2025/2026"
                    autoFocus
                    className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-3.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
                  />
                </div>

                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-xs font-medium text-[#111827]">Data awal tahun ajaran baru</legend>

                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 ${
                      modeTambah === "kosong" ? "border-[#2F6BE8] bg-[#EEF3FD]" : "border-[#E8EAEE]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={modeTambah === "kosong"}
                      onChange={() => setModeTambah("kosong")}
                      className="mt-0.5 accent-[#2F6BE8]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#111827]">Kosongkan</span>
                      <span className="block text-xs text-[#6B7280]">Mulai dari nol, isi ulang semua data.</span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 rounded-[10px] border p-3 ${
                      !adaTahunAjaran ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    } ${modeTambah === "salin" ? "border-[#2F6BE8] bg-[#EEF3FD]" : "border-[#E8EAEE]"}`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      disabled={!adaTahunAjaran}
                      checked={modeTambah === "salin"}
                      onChange={() => setModeTambah("salin")}
                      className="mt-0.5 accent-[#2F6BE8]"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-[#111827]">Salin dari T.A. sebelumnya</span>
                      <span className="block text-xs text-[#6B7280]">
                        Disalin: penugasan dosen, CPMK, Sub-CPMK, Tugas, dan pemetaannya. Tidak disalin: pendaftaran
                        mahasiswa, nilai, dan hasil capaian.
                      </span>
                      {modeTambah === "salin" && (
                        <select
                          value={sumberId}
                          onChange={(e) => setSumberId(e.target.value)}
                          className="mt-2 h-9 w-full rounded-lg bg-white px-2 text-sm text-[#111827] outline-none ring-1 ring-[#E8EAEE]"
                        >
                          {daftarTahunAjaran.map((ta) => (
                            <option key={ta.id} value={ta.id}>
                              {ta.label}
                              {ta.status === "AKTIF" ? " (Aktif)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                  </label>
                </fieldset>

                <p className="text-xs text-[#6B7280]">T.A. baru belum aktif. Pilih dari daftar untuk mengaktifkannya.</p>
                {errorTambah && <p className="text-xs text-[#DC2626]">{errorTambah}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setModalTambah(false)} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
                    Batal
                  </button>
                  <button type="submit" disabled={loadingTambah} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-60">
                    {loadingTambah ? "Menambahkan…" : "Tambah"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Dialog Hapus T.A. */}
      {hapusTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6">
              <h2 className="mb-2 text-base font-bold text-[#111827]">Hapus T.A. {hapusTarget.label}?</h2>
              <p className="mb-4 text-sm text-[#6B7280]">
                {jumlahTerkait === null
                  ? "Memeriksa data terkait…"
                  : jumlahTerkait > 0
                  ? `T.A. ini punya ${jumlahTerkait} data terkait (CPMK, Sub-CPMK, Tugas, Nilai, dll). Semuanya akan ikut terhapus dan tidak bisa dibatalkan.`
                  : "T.A. ini belum punya data terkait."}
              </p>
              {errorHapus && <p className="mb-3 text-xs text-[#DC2626]">{errorHapus}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setHapusTarget(null)} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
                  Batal
                </button>
                <button onClick={konfirmasiHapus} disabled={loadingHapus || jumlahTerkait === null} className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-60">
                  {loadingHapus ? "Menghapus…" : "Hapus"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}