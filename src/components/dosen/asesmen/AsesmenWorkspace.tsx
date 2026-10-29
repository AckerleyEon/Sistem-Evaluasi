"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "../Ikon";
import { hapusTugas } from "@/lib/actions/asesmen";
import { BarisKonteks } from "./BarisKonteks";
import { DistribusiBobot } from "./DistribusiBobot";
import { FOKUS } from "./KartuUI";
import { MatriksSub } from "./MatriksSub";
import { ModalImporAsesmen } from "./ModalImporAsesmen";
import { ModalTugas } from "./ModalTugas";
import { TabelTugas, UKURAN_HALAMAN, type UrutTabel } from "./TabelTugas";
import { ToastAksi, type IsiToast } from "./ToastAksi";
import type { DataAsesmen, RingkasanBuat, TugasRow } from "./tipe";

export function AsesmenWorkspace({ data }: { data: DataAsesmen }) {
  const router = useRouter();
  const tombolBuat = useRef<HTMLButtonElement>(null);
  const [modal, setModal] = useState(false);
  const [modalImpor, setModalImpor] = useState(false);
  const [toast, setToast] = useState<IsiToast | null>(null);
  const [baruId, setBaruId] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [kodeAktif, setKodeAktif] = useState<string | null>(null);
  const [urut, setUrut] = useState<UrutTabel>("terbaru");
  const [halaman, setHalaman] = useState(1);
  const [hapusPending, mulaiHapus] = useTransition();
  const tutupToast = useCallback(() => setToast(null), []);
  const aktif = data.tahunAjaran.status === "AKTIF";

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
    const peringatan =
      t.masuk > 0
        ? `Hapus "${t.nama}"? ${t.masuk} nilai mahasiswa pada tugas ini juga akan terhapus. Bobot tugas lain akan dihitung ulang proporsional.`
        : `Hapus "${t.nama}"? Bobot tugas lain akan dihitung ulang proporsional.`;
    if (!window.confirm(peringatan)) return;
    mulaiHapus(async () => {
      const hasil = await hapusTugas(data.mataKuliah.id, t.id, data.kelas?.id);
      setToast({ nada: hasil.ok ? "ok" : "galat", judul: hasil.ok ? "Tugas dihapus" : "Gagal menghapus", deskripsi: hasil.pesan });
      if (hasil.ok) {
        if (baruId === t.id) setBaruId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
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
            className={`flex min-h-[40px] items-center gap-2 rounded-[10px] bg-[#2563EB] px-4 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] transition hover:bg-[#1D4ED8] ${FOKUS}`}
          >
            <Ikon nama="tabel" ukuran={14} />
            Import Asesmen MK (.xlsx)
          </button>
        )}
      </div>

      <BarisKonteks data={data} onBuatTugas={() => setModal(true)} tombolBuatRef={tombolBuat} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DistribusiBobot tugas={semua} sorotId={baruId} kodeAktif={kodeAktif} onPilih={pilihKode} />
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
        sedangHapus={hapusPending}
        readOnly={!aktif}
      />

      {modal && <ModalTugas data={data} onTutup={() => setModal(false)} onSukses={sukses} />}
      {modalImpor && (
        <ModalImporAsesmen
          mataKuliahId={data.mataKuliah.id}
          kelasId={data.kelas?.id ?? null}
          namaMK={data.mataKuliah.nama}
          onTutup={() => setModalImpor(false)}
          onSelesai={(pesan) => {
            setModalImpor(false);
            setToast({ nada: "ok", judul: "Impor asesmen selesai", deskripsi: pesan });
          }}
        />
      )}
      {toast && <ToastAksi isi={toast} onTutup={tutupToast} />}
    </div>
  );
}
