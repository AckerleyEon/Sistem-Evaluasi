"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TahunAjaranItem = { id: string; label: string };
type CPLItem = {
  id: string;
  kode: string;
  deskripsi: string;
  jumlahMataKuliah: number;
  rataRata: number | null;
  jumlahLengkap: number;
  jumlahMahasiswa: number;
};
type ProfilItem = { id: string; kode: string; nama: string };
type MahasiswaItem = {
  id: string;
  nim: string;
  nama: string;
  angkatan: number;
  hasilProfil: Map<string, { nilai: number; statusLengkap: boolean }>;
};

function GrafikCakupanCPL({ data }: { data: CPLItem[] }) {
  const maksimum = Math.max(1, ...data.map((item) => item.jumlahMataKuliah));

  return (
    <section className="rounded-2xl border border-[#E5EAF3] bg-white p-5 shadow-[0_2px_8px_rgba(23,43,77,.04)] sm:p-6 lg:flex lg:h-86.25 lg:min-h-0 lg:flex-col">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#111827]">Cakupan Mata Kuliah per CPL</h2>
        <p className="mt-1 text-xs text-[#64748B]">Jumlah mata kuliah yang dipetakan ke setiap CPL.</p>
      </div>
      {data.length ? (
        <div className="min-w-0 pb-2">
          <div
            role="img"
            aria-label={`Grafik jumlah mata kuliah per CPL: ${data.map((item) => `${item.kode} ${item.jumlahMataKuliah} mata kuliah`).join(", ")}`}
            className="grid h-56 w-full items-end gap-1 border-b border-[#E5EAF3] px-1 sm:gap-2 sm:px-2"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
          >
            {data.map((item) => (
              <div key={item.id} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <span className="text-[11px] font-semibold text-[#475569]">{item.jumlahMataKuliah}</span>
                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    className="w-full max-w-13 rounded-t-lg bg-[#2F6BE8] transition-[height]"
                    style={{ height: `${Math.max(4, (item.jumlahMataKuliah / maksimum) * 100)}%` }}
                    title={`${item.kode}: ${item.jumlahMataKuliah} mata kuliah`}
                  />
                </div>
                <span className="max-w-full truncate pb-2 text-[10px] font-semibold text-[#2F6BE8] sm:text-[11px]">{item.kode}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-[#F8FAFC] p-5 text-sm text-[#64748B]">Belum ada data CPL.</p>
      )}
    </section>
  );
}

function KartuRataRataCPL({ data }: { data: CPLItem[] }) {
  return (
    <section className="rounded-2xl border border-[#E5EAF3] bg-white p-5 shadow-[0_2px_8px_rgba(23,43,77,.04)] sm:p-6 lg:flex lg:h-86.25 lg:min-h-0 lg:flex-col">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#111827]">Rata-rata Capaian per CPL</h2>
        <p className="mt-1 text-xs text-[#64748B]">Rata-rata nilai hasil CPL untuk filter tahun ajaran dan angkatan terpilih.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:content-start lg:overflow-y-auto lg:pr-1">
        {data.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-[#FAFBFE] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D4ED8]">{item.kode}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#64748B]">{item.deskripsi}</p>
              </div>
              <span className="shrink-0 text-xl font-bold tabular-nums text-[#111827]">
                {item.rataRata === null ? "—" : item.rataRata.toFixed(1)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5EAF3]">
              <div
                className="h-full rounded-full bg-[#2F6BE8]"
                style={{ width: `${Math.max(0, Math.min(100, item.rataRata ?? 0))}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#64748B]">
              {item.jumlahMahasiswa > 0
                ? `${item.jumlahLengkap}/${item.jumlahMahasiswa} hasil lengkap`
                : "Belum ada hasil capaian"}
            </p>
          </article>
        ))}
        {!data.length && <p className="text-sm text-[#64748B]">Belum ada data CPL.</p>}
      </div>
    </section>
  );
}

function GrafikProfilMahasiswa({
  mahasiswa,
  daftarProfil,
}: {
  mahasiswa: MahasiswaItem;
  daftarProfil: ProfilItem[];
}) {
  return (
    <article className="rounded-2xl border border-[#E5EAF3] bg-white p-4 shadow-[0_2px_8px_rgba(23,43,77,.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/laporan/mahasiswa/${mahasiswa.id}`}
            className="block truncate text-sm font-bold text-[#1D4ED8] hover:underline"
          >
            {mahasiswa.nama}
          </Link>
          <p className="mt-1 text-[11px] text-[#64748B]">{mahasiswa.nim} · Angkatan {mahasiswa.angkatan}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EEF3FD] px-2.5 py-1 text-[10px] font-semibold text-[#2F6BE8]">
          {mahasiswa.hasilProfil.size}/{daftarProfil.length} PL
        </span>
      </div>
      <div className="space-y-3">
        {daftarProfil.map((profil) => {
          const hasil = mahasiswa.hasilProfil.get(profil.id);
          return (
            <div key={profil.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                <span className="min-w-0 truncate font-medium text-[#334155]" title={`${profil.kode} — ${profil.nama}`}>
                  {profil.kode} · {profil.nama}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[#111827]">
                  {hasil ? hasil.nilai.toFixed(1) : "—"}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-[#E8EDF5]"
                role="img"
                aria-label={`${profil.kode}: ${hasil ? `${hasil.nilai.toFixed(1)}${hasil.statusLengkap ? ", lengkap" : ", belum lengkap"}` : "belum ada hasil"}`}
              >
                {hasil && (
                  <div
                    className={`h-full rounded-full ${hasil.statusLengkap ? "bg-[#2F6BE8]" : "bg-[#F59E0B]"}`}
                    style={{ width: `${Math.max(0, Math.min(100, hasil.nilai))}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {!daftarProfil.length && <p className="text-xs text-[#64748B]">Belum ada Profil Lulusan yang didefinisikan.</p>}
      </div>
    </article>
  );
}

export function LaporanAdminWorkspace({
  daftarTahunAjaran,
  tahunAjaranId,
  daftarAngkatan,
  angkatan,
  dataCPL,
  daftarProfil,
  dataMahasiswa,
}: {
  daftarTahunAjaran: TahunAjaranItem[];
  tahunAjaranId: string;
  daftarAngkatan: number[];
  angkatan: number | null;
  dataCPL: CPLItem[];
  daftarProfil: ProfilItem[];
  dataMahasiswa: MahasiswaItem[];
}) {
  const [pencarian, setPencarian] = useState("");
  const [halaman, setHalaman] = useState(1);
  const mahasiswaTersaring = useMemo(() => {
    const kunci = pencarian.trim().toLocaleLowerCase("id");
    if (!kunci) return dataMahasiswa;
    return dataMahasiswa.filter(
      (item) => item.nama.toLocaleLowerCase("id").includes(kunci) || item.nim.includes(kunci),
    );
  }, [dataMahasiswa, pencarian]);
  const ukuranHalaman = 12;
  const totalHalaman = Math.max(1, Math.ceil(mahasiswaTersaring.length / ukuranHalaman));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mahasiswaHalaman = mahasiswaTersaring.slice(
    (halamanAktif - 1) * ukuranHalaman,
    halamanAktif * ukuranHalaman,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Laporan Capaian</h1>
          <p className="mt-1 text-sm text-[#64748B]">Ringkasan cakupan CPL dan capaian Profil Lulusan mahasiswa.</p>
        </div>
        <span className="w-fit rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
          {dataMahasiswa.length} mahasiswa
        </span>
      </header>

      <form className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF3] bg-white p-4 shadow-[0_2px_8px_rgba(23,43,77,.04)] sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-[#334155]">
          Tahun Ajaran
          <select
            name="ta"
            defaultValue={tahunAjaranId}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 text-sm font-normal text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
          >
            {daftarTahunAjaran.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs font-semibold text-[#334155]">
          Angkatan
          <select
            name="angkatan"
            defaultValue={angkatan === null ? "" : String(angkatan)}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 text-sm font-normal text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
          >
            <option value="">Semua Angkatan</option>
            {daftarAngkatan.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-[#2F6BE8] px-5 text-sm font-semibold text-white hover:bg-[#2459C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6BE8]"
        >
          Tampilkan
        </button>
      </form>

      {!daftarTahunAjaran.length ? (
        <section className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-sm text-[#92400E]">
          Belum ada Tahun Ajaran. Buat Tahun Ajaran terlebih dahulu untuk melihat laporan.
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
            <GrafikCakupanCPL data={dataCPL} />
            <KartuRataRataCPL data={dataCPL} />
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827]">Capaian Profil Lulusan per Mahasiswa</h2>
                <p className="mt-1 text-xs text-[#64748B]">Grafik menampilkan nilai setiap PL untuk mahasiswa yang terdaftar pada tahun ajaran terpilih.</p>
              </div>
              <label className="text-xs font-medium text-[#64748B]">
                Cari mahasiswa
                <input
                  type="search"
                  value={pencarian}
                  onChange={(event) => {
                    setPencarian(event.target.value);
                    setHalaman(1);
                  }}
                  placeholder="Nama atau NIM"
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30 sm:w-64"
                />
              </label>
            </div>

            {mahasiswaHalaman.length ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {mahasiswaHalaman.map((item) => (
                    <GrafikProfilMahasiswa key={item.id} mahasiswa={item} daftarProfil={daftarProfil} />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
                  <span>
                    Menampilkan {(halamanAktif - 1) * ukuranHalaman + 1}–{Math.min(halamanAktif * ukuranHalaman, mahasiswaTersaring.length)} dari {mahasiswaTersaring.length} mahasiswa
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHalaman((value) => Math.max(1, value - 1))}
                      disabled={halamanAktif <= 1}
                      className="h-9 rounded-lg border border-[#D8E0EC] px-3 font-semibold text-[#334155] disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <span>{halamanAktif}/{totalHalaman}</span>
                    <button
                      type="button"
                      onClick={() => setHalaman((value) => Math.min(totalHalaman, value + 1))}
                      disabled={halamanAktif >= totalHalaman}
                      className="h-9 rounded-lg border border-[#D8E0EC] px-3 font-semibold text-[#334155] disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-sm text-[#64748B]">
                {pencarian
                  ? "Mahasiswa tidak ditemukan."
                  : "Tidak ada mahasiswa terdaftar pada filter tahun ajaran dan angkatan ini."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
