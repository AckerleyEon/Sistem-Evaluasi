"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "../Ikon";
import { hapusTugas } from "@/lib/actions/asesmen";
import { BannerAksi, type IsiBanner } from "./BannerAksi";
import { DistribusiBobot } from "./DistribusiBobot";
import { FOKUS, KARTU } from "./KartuUI";
import { KartuPanduan, KartuUnduh } from "./KartuBawah";
import { KpiAsesmen } from "./KpiAsesmen";
import { MatriksCPMK } from "./MatriksCPMK";
import { ModalTugas } from "./ModalTugas";
import { TabelTugas, UKURAN_HALAMAN, type UrutTabel } from "./TabelTugas";
import type { DataAsesmen, RingkasanBuat, StatusTugas, TugasRow } from "./tipe";

type FilterStatus = "semua" | StatusTugas;
const OPSI_FILTER: { nilai: FilterStatus; label: string }[] = [
  { nilai: "semua", label: "Semua Tugas" },
  { nilai: "baru", label: "Baru dibuat" },
  { nilai: "berjalan", label: "Berjalan" },
  { nilai: "dinilai", label: "Dinilai" },
  { nilai: "belum", label: "Belum" },
];

function inisial(nama: string) {
  const k = nama.split(/\s+/).filter(Boolean);
  return ((k[0]?.[0] ?? "") + (k[1]?.[0] ?? "")).toUpperCase();
}

export function AsesmenWorkspace({ data }: { data: DataAsesmen }) {
  const router = useRouter();
  const tombolBuat = useRef<HTMLButtonElement>(null);
  const [modal, setModal] = useState(false);
  const [banner, setBanner] = useState<IsiBanner | null>(null);
  const [baruId, setBaruId] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [kodeAktif, setKodeAktif] = useState<string | null>(null);
  const [urut, setUrut] = useState<UrutTabel>("terbaru");
  const [halaman, setHalaman] = useState(1);
  const [hapusPending, mulaiHapus] = useTransition();

  // Banner hilang otomatis setelah 8 detik.
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 8000);
    return () => window.clearTimeout(id);
  }, [banner]);

  // Status "Baru dibuat" hanya untuk tugas yang baru ditambahkan dan belum punya nilai.
  const semua: TugasRow[] = useMemo(
    () => data.tugas.map((t) => (t.id === baruId && t.masuk === 0 ? { ...t, status: "baru" as const } : t)),
    [data.tugas, baruId],
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const hasil = semua.filter((t) => {
      if (filter !== "semua" && t.status !== filter) return false;
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
  }, [semua, cari, filter, kodeAktif, urut, baruId]);

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
    setFilter("semua");
    setKodeAktif(null);
    setUrut("terbaru");
    setHalaman(1);
    const kode = `T${data.tugas.length + 1}`;
    setBanner({
      nada: "ok",
      judul: "Tugas berhasil disimpan dan dipetakan",
      deskripsi: `"${r.nama}" ditambahkan dengan bobot ${r.bobot}% • ${r.cpmkAngka.map((a) => `CPMK ${a}`).join(" • ")}`,
      kode,
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
      setBanner({ nada: hasil.ok ? "ok" : "galat", judul: hasil.ok ? "Tugas dihapus" : "Gagal menghapus", deskripsi: hasil.pesan });
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
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            title="Fitur salin tugas dari semester lalu belum tersedia"
            className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 text-[12px] font-semibold text-[#334155] opacity-60"
          >
            <Ikon nama="riwayat" ukuran={14} />
            Salin dari Semester Lalu
          </button>
          {data.tahunAjaran.status === "AKTIF" && (
            <button
              ref={tombolBuat}
              type="button"
              onClick={() => setModal(true)}
              className={`flex min-h-[34px] items-center gap-1.5 rounded-full bg-[#2563EB] px-3.5 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] transition hover:bg-[#1D4ED8] ${FOKUS}`}
            >
              <Ikon nama="plus" ukuran={14} />
              Buat Tugas Baru
            </button>
          )}
        </div>
      </div>

      {banner && <BannerAksi isi={banner} onTutup={() => setBanner(null)} />}

      {/* Toolbar */}
      <div className={`${KARTU} flex flex-wrap items-center gap-3 p-3`}>
        <label className="flex min-h-[40px] items-center gap-2.5 rounded-xl bg-[#EFF6FF] px-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white">
            {inisial(data.mataKuliah.nama)}
          </span>
          <span className="sr-only">Mata kuliah</span>
          <span className="leading-tight">
            <select
              value={data.mataKuliah.id}
              onChange={(e) => router.push(`/dosen/komponen-penilaian/${e.target.value}`)}
              className={`max-w-[200px] cursor-pointer bg-transparent text-[12px] font-bold ${FOKUS}`}
            >
              {data.daftarMK.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-[#64748B]">
              {data.mataKuliah.sks} SKS • ({data.mahasiswa} Mhs)
            </span>
          </span>
          <Ikon nama="atasBawah" ukuran={14} className="text-[#64748B]" />
        </label>

        {data.daftarKelas.length > 0 && (
          <label className="flex min-h-[40px] items-center gap-2 rounded-xl bg-[#F3F5F9] px-3 text-[12px] font-semibold">
            <span>Kelas</span>
            <select
              value={data.kelas?.id ?? ""}
              onChange={(e) => {
                const suffix = e.target.value ? `?kelas=${encodeURIComponent(e.target.value)}` : "";
                router.push(`/dosen/komponen-penilaian/${data.mataKuliah.id}${suffix}`);
              }}
              className={`max-w-[180px] cursor-pointer bg-transparent ${FOKUS}`}
            >
              {data.daftarKelas.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}
            </select>
          </label>
        )}

        <label className="flex min-h-[40px] min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[#F3F5F9] px-3 focus-within:ring-2 focus-within:ring-[#60A5FA]">
          <Ikon nama="cari" ukuran={15} className="text-[#64748B]" />
          <span className="sr-only">Cari tugas</span>
          <input
            value={cari}
            onChange={(e) => {
              setCari(e.target.value);
              setHalaman(1);
            }}
            placeholder="Cari judul tugas, instrumen, atau CPMK..."
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#64748B]"
          />
        </label>

        <label className="flex min-h-[40px] items-center rounded-xl bg-[#F3F5F9] px-3">
          <span className="sr-only">Filter status</span>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterStatus);
              setHalaman(1);
            }}
            className={`cursor-pointer bg-transparent text-[12px] font-semibold ${FOKUS}`}
          >
            {OPSI_FILTER.map((o) => (
              <option key={o.nilai} value={o.nilai}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {kodeAktif && (
          <button
            type="button"
            onClick={() => setKodeAktif(null)}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-full bg-[#DBEAFE] px-3 text-[12px] font-semibold text-[#1D4ED8] ${FOKUS}`}
          >
            Tugas {kodeAktif}
            <Ikon nama="tutup" ukuran={12} />
            <span className="sr-only">Hapus filter</span>
          </button>
        )}
      </div>

      <KpiAsesmen tugas={semua} cpmk={data.cpmk} mahasiswa={data.mahasiswa} labelTA={data.tahunAjaran.label} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DistribusiBobot tugas={semua} sorotId={baruId} kodeAktif={kodeAktif} onPilih={pilihKode} />
        <MatriksCPMK cpmk={data.cpmk} tugas={semua} sorotId={baruId} kodeAktif={kodeAktif} onPilih={pilihKode} />
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
        sorotId={baruId}
        mataKuliahId={data.mataKuliah.id}
        namaMK={data.mataKuliah.nama}
        onHapus={hapus}
        sedangHapus={hapusPending}
        readOnly={data.tahunAjaran.status === "ARSIP"}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <KartuPanduan />
        <KartuUnduh mataKuliahId={data.mataKuliah.id} kelasId={data.kelas?.id ?? null} readOnly={data.tahunAjaran.status === "ARSIP"} />
      </div>

      {modal && <ModalTugas data={data} onTutup={() => setModal(false)} onSukses={sukses} />}
    </div>
  );
}
