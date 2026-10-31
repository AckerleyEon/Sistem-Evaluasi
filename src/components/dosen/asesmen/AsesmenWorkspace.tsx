"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "../Ikon";
import { hapusSemuaTugas, hapusTugas } from "@/lib/actions/asesmen";
import { BarisKonteks } from "./BarisKonteks";
import { DistribusiBobot } from "./DistribusiBobot";
import { FOKUS } from "./KartuUI";
import { MatriksSub } from "./MatriksSub";
import { ModalImporAsesmen } from "./ModalImporAsesmen";
import { ModalTugas } from "./ModalTugas";
import { TabelTugas, UKURAN_HALAMAN, type UrutTabel } from "./TabelTugas";
import { ToastAksi, type IsiToast } from "./ToastAksi";
import type { DataAsesmen, RingkasanBuat, TugasRow } from "./tipe";

type KonfirmasiHapus =
  | { jenis: "satu"; tugas: TugasRow }
  | { jenis: "semua"; jumlahNilai: number };

export function AsesmenWorkspace({ data }: { data: DataAsesmen }) {
  const router = useRouter();
  const tombolBuat = useRef<HTMLButtonElement>(null);
  const dialogHapus = useRef<HTMLDialogElement>(null);
  const [modal, setModal] = useState(false);
  const [modalImpor, setModalImpor] = useState(false);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<KonfirmasiHapus | null>(null);
  const [toast, setToast] = useState<IsiToast | null>(null);
  const [baruId, setBaruId] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [kodeAktif, setKodeAktif] = useState<string | null>(null);
  const [urut, setUrut] = useState<UrutTabel>("terbaru");
  const [halaman, setHalaman] = useState(1);
  const [hapusPending, mulaiHapus] = useTransition();
  const tutupToast = useCallback(() => setToast(null), []);
  const aktif = data.tahunAjaran.status === "AKTIF";

  useEffect(() => {
    const dialog = dialogHapus.current;
    if (!dialog || !konfirmasiHapus) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [konfirmasiHapus]);

  // Status "Baru dibuat" hanya untuk tugas yang baru ditambahkan dan belum punya nilai.
  const semua: TugasRow[] = useMemo(
    () => data.tugas.map((t) => (t.id === baruId && t.masuk === 0 ? { ...t, status: "baru" as const } : t)),
    [data.tugas, baruId],
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const hasil = semua.filter((t) => {
      if (kodeAktif && t.kode !== kodeAktif) return false;
      if (!q) return true;
      return (
        t.nama.toLowerCase().includes(q) ||
        t.kode.toLowerCase().includes(q) ||
        t.cpmkAngka.some((a) => `cpmk ${a}`.includes(q) || a === q)
      );
    });
    const indeks = new Map(semua.map((t, i) => [t.id, i]));
    const persen = (t: TugasRow) => (t.total ? t.masuk / t.total : 0);
    return hasil.sort((a, b) => {
      if (urut === "bobot") return b.bobot - a.bobot;
      if (urut === "kode") return (indeks.get(a.id) ?? 0) - (indeks.get(b.id) ?? 0);
      if (urut === "progres") return persen(a) - persen(b);
      // "terbaru": tugas yang baru dibuat selalu di atas, lalu urutan pembuatan terbalik
      if (a.id === baruId) return -1;
      if (b.id === baruId) return 1;
      return (indeks.get(b.id) ?? 0) - (indeks.get(a.id) ?? 0);
    });
  }, [semua, cari, kodeAktif, urut, baruId]);

  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / UKURAN_HALAMAN));
  const halamanAman = Math.min(halaman, jumlahHalaman);
  const tampil = tersaring.slice((halamanAman - 1) * UKURAN_HALAMAN, halamanAman * UKURAN_HALAMAN);

  function pilihKode(kode: string) {
    setKodeAktif((k) => (k === kode ? null : kode));
    setHalaman(1);
  }

  function sukses(r: RingkasanBuat) {
    setModal(false);
    setBaruId(r.id);
    setCari("");
    setKodeAktif(null);
    setUrut("terbaru");
    setHalaman(1);
    setToast({
      nada: "ok",
      judul: "Tugas berhasil disimpan dan dipetakan",
      deskripsi: `"${r.nama}" ditambahkan dengan bobot ${r.bobot}% • ${r.cpmkAngka.map((a) => `CPMK ${a}`).join(" • ")}`,
      kode: `T${data.tugas.length + 1}`,
    });
    router.refresh();
    tombolBuat.current?.focus();
  }

  function hapus(t: TugasRow) {
    setKonfirmasiHapus({ jenis: "satu", tugas: t });
  }

  function hapusSemua() {
    if (!data.kelas || semua.length === 0 || !aktif || hapusPending) return;
    const jumlahNilai = semua.reduce((jumlah, tugas) => jumlah + tugas.masuk, 0);
    setKonfirmasiHapus({ jenis: "semua", jumlahNilai });
  }

  function konfirmasiPenghapusan() {
    if (!konfirmasiHapus || hapusPending) return;
    const pilihan = konfirmasiHapus;
    setKonfirmasiHapus(null);
    mulaiHapus(async () => {
      try {
        const hasil = pilihan.jenis === "semua"
          ? await hapusSemuaTugas(data.mataKuliah.id, data.kelas.id)
          : await hapusTugas(data.mataKuliah.id, pilihan.tugas.id, data.kelas.id);
        setToast({
          nada: hasil.ok ? "ok" : "galat",
          judul: hasil.ok
            ? pilihan.jenis === "semua" ? "Seluruh tugas dihapus" : "Tugas dihapus"
            : "Gagal menghapus tugas",
          deskripsi: hasil.pesan,
        });
        if (hasil.ok) {
          if (pilihan.jenis === "semua") {
            setBaruId(null);
            setCari("");
            setKodeAktif(null);
            setHalaman(1);
          } else if (baruId === pilihan.tugas.id) {
            setBaruId(null);
          }
          router.refresh();
        }
      } catch (error) {
        setToast({
          nada: "galat",
          judul: "Gagal menghapus tugas",
          deskripsi: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus tugas.",
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Header halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-bold leading-8">Manajemen Tugas &amp; Asesmen</h1>
          <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            Tahun Ajaran {data.tahunAjaran.label}
          </span>
        </div>
        {aktif && (
          <button
            type="button"
            onClick={() => setModalImpor(true)}
            className={`flex min-h-10 items-center gap-2 rounded-[10px] bg-[#2563EB] px-4 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] transition hover:bg-[#1D4ED8] ${FOKUS}`}
          >
            <Ikon nama="tabel" ukuran={14} />
            Import Asesmen MK (.xlsx)
          </button>
        )}
      </div>

      <BarisKonteks data={data} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <DistribusiBobot
          tugas={semua}
          sorotId={baruId}
          kodeAktif={kodeAktif}
          onPilih={pilihKode}
          onBuatTugas={() => setModal(true)}
          tombolBuatRef={tombolBuat}
          aktif={aktif}
        />
        <MatriksSub cpmk={data.cpmk} tugas={semua} sorotId={baruId} kodeAktif={kodeAktif} onPilih={pilihKode} />
      </div>

      <TabelTugas
        baris={tampil}
        totalSemua={semua.length}
        totalTersaring={tersaring.length}
        halaman={halamanAman}
        onHalaman={setHalaman}
        urut={urut}
        onUrut={(u) => {
          setUrut(u);
          setHalaman(1);
        }}
        cari={cari}
        onCari={(nilai) => {
          setCari(nilai);
          setHalaman(1);
        }}
        sorotId={baruId}
        mataKuliahId={data.mataKuliah.id}
        namaMK={data.mataKuliah.nama}
        namaKelas={data.kelas?.nama ?? null}
        onHapus={hapus}
        onHapusSemua={hapusSemua}
        sedangHapus={hapusPending}
        readOnly={!aktif}
      />

      {modal && <ModalTugas data={data} onTutup={() => setModal(false)} onSukses={sukses} />}
      {modalImpor && (
        <ModalImporAsesmen
          mataKuliahId={data.mataKuliah.id}
          namaMK={data.mataKuliah.nama}
          onTutup={() => setModalImpor(false)}
          onSelesai={(pesan) => {
            setModalImpor(false);
            setToast({ nada: "ok", judul: "Impor asesmen selesai", deskripsi: pesan });
          }}
        />
      )}
      {konfirmasiHapus && (
        <dialog
          ref={dialogHapus}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="judul-konfirmasi-hapus"
          aria-describedby="deskripsi-konfirmasi-hapus"
          onCancel={(event) => {
            event.preventDefault();
            setKonfirmasiHapus(null);
          }}
          onClick={(event) => {
            if (event.target === dialogHapus.current) setKonfirmasiHapus(null);
          }}
          className="m-auto w-[min(92vw,30rem)] rounded-2xl bg-white p-0 text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,.25)] backdrop:bg-[rgba(15,23,42,.45)]"
        >
          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
                <Ikon nama="hapus" ukuran={18} />
              </span>
              <div>
                <h2 id="judul-konfirmasi-hapus" className="text-[15px] font-bold">
                  {konfirmasiHapus.jenis === "semua" ? "Hapus semua tugas?" : "Hapus tugas ini?"}
                </h2>
                <p id="deskripsi-konfirmasi-hapus" className="mt-1 text-[12px] leading-relaxed text-[#475569]">
                  {konfirmasiHapus.jenis === "semua"
                    ? `Semua ${semua.length} tugas di ${data.mataKuliah.nama}, kelas ${data.kelas.nama} akan dihapus, termasuk ${konfirmasiHapus.jumlahNilai} nilai dan seluruh pemetaan Sub-CPMK terkait.`
                    : `Tugas "${konfirmasiHapus.tugas.nama}" akan dihapus${konfirmasiHapus.tugas.masuk > 0 ? ` bersama ${konfirmasiHapus.tugas.masuk} nilai mahasiswa` : ""}. Bobot tugas lainnya akan dihitung ulang secara proporsional.`}
                  {" "}Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
          </div>
          <footer className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
            <button
              type="button"
              onClick={() => setKonfirmasiHapus(null)}
              className={`min-h-9 rounded-lg border border-[#E5E7EB] px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] ${FOKUS}`}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={konfirmasiPenghapusan}
              className={`min-h-9 rounded-lg bg-[#DC2626] px-4 text-[12px] font-semibold text-white hover:bg-[#B91C1C] ${FOKUS}`}
            >
              Hapus
            </button>
          </footer>
        </dialog>
      )}
      {toast && <ToastAksi isi={toast} onTutup={tutupToast} />}
    </div>
  );
}
