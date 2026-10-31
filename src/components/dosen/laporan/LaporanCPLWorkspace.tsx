"use client";

import { useMemo, useState } from "react";
import type { DataLaporanCPL, MahasiswaLaporan, NilaiKomponenLaporan } from "@/lib/laporan-cpl";

function format(nilai: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(nilai);
}

function inisial(nama: string) {
  return nama.split(/\s+/).filter(Boolean).slice(0, 2).map((kata) => kata[0]).join("").toUpperCase();
}

function InputCari({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full bg-[#F1F5F9] pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-[#2563EB]/30"
      />
    </label>
  );
}

function Card({
  title,
  subtitle,
  headerRight,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04)] ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1E3A8A]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#64748B]">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

function Radar({
  items,
  threshold,
}: {
  items: { kode: string; nilai: number | null }[];
  threshold: number;
}) {
  const valid = items.filter((item) => item.nilai !== null);
  if (valid.length < 3) {
    return (
      <div className="grid min-h-55 place-items-center px-4 text-center text-xs text-[#64748B]">
        Belum cukup data untuk menampilkan grafik CPL.
      </div>
    );
  }

  const cx = 125;
  const cy = 108;
  const radius = 73;
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / valid.length;
  const point = (index: number, value: number) => ({
    x: cx + Math.cos(angle(index)) * radius * (Math.max(0, Math.min(value, 100)) / 100),
    y: cy + Math.sin(angle(index)) * radius * (Math.max(0, Math.min(value, 100)) / 100),
  });
  const polygon = (value: (item: typeof valid[number]) => number) =>
    valid.map((item, index) => {
      const p = point(index, value(item));
      return `${p.x},${p.y}`;
    }).join(" ");

  return (
    <svg
      viewBox="0 0 270 218"
      role="img"
      aria-label={`Grafik CPL: ${valid.map((item) => `${item.kode} ${format(item.nilai!)}`).join(", ")}`}
      className="h-72 w-full overflow-visible"
    >
      {[20, 40, 60, 80, 100].map((ring) => (
        <polygon
          key={ring}
          points={valid.map((_, index) => {
            const p = point(index, ring);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      ))}
      {valid.map((_, index) => {
        const p = point(index, 100);
        return <line key={index} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#CBD5E1" />;
      })}
      <polygon points={polygon(() => threshold)} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points={polygon((item) => item.nilai ?? 0)} fill="rgba(37,99,235,.18)" stroke="#2563EB" strokeWidth="2" />
      {valid.map((item, index) => {
        const p = point(index, item.nilai ?? 0);
        const label = point(index, 132);
        return (
          <g key={item.kode}>
            <circle cx={p.x} cy={p.y} r="3" fill="#2563EB" />
            <text x={label.x} y={label.y + 3} textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">
              {item.kode}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DaftarNilai({ items }: { items: { kode: string; nilai: number | null }[] }) {
  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
      {items.map((item) => (
        <div key={item.kode} className="flex items-center justify-between gap-2 rounded-md bg-[#EEF3FC] px-5 py-2 text-xs text-[#334155]">
          <span className="truncate">{item.kode}</span>
          <b className="shrink-0 text-[#1D4ED8]">{item.nilai === null ? "–" : format(item.nilai)}</b>
        </div>
      ))}
      {items.length === 0 && <p className="py-8 text-center text-sm text-[#64748B]">Belum ada komponen.</p>}
    </div>
  );
}

function ProgressKomponen({
  items,
  threshold,
}: {
  items: NilaiKomponenLaporan[];
  threshold: number;
}) {
  if (items.length === 0) return <p className="py-10 text-center text-sm text-[#64748B]">Tidak ada Sub-CPMK yang cocok.</p>;

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
      {items.map((item) => {
        const hasilAda = item.jumlahData > 0;
        const tuntas = hasilAda && item.nilai >= threshold;
        const warna = !hasilAda ? "bg-[#CBD5E1]" : tuntas ? "bg-[#2563EB]" : "bg-[#D97706]";
        return (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <b className="truncate text-[#1E3A8A]" title={item.kode}>{item.kode}</b>
              <span className={`shrink-0 font-semibold ${!hasilAda ? "text-[#64748B]" : tuntas ? "text-[#15803D]" : "text-[#B45309]"}`}>
                {!hasilAda ? "Belum ada data" : `${Math.round(item.nilai)}% ${tuntas ? "Tuntas" : "Belum Tuntas"}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className={`h-full rounded-full ${warna}`} style={{ width: `${hasilAda ? Math.min(100, item.nilai) : 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressMataKuliah({
  items,
  threshold,
  selectedId,
  onSelect,
}: {
  items: { id: string; nama: string; nilai: number | null; jumlahCPMK: number; totalCPMK: number }[];
  threshold: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return <p className="py-10 text-center text-sm text-[#64748B]">Belum ada data mata kuliah.</p>;

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
      {items.map((item) => {
        const nilai = item.nilai;
        const hasilAda = nilai !== null;
        const tuntas = nilai !== null && nilai >= threshold;
        const warna = !hasilAda ? "bg-[#CBD5E1]" : tuntas ? "bg-[#2563EB]" : "bg-[#D97706]";
        const aktif = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={aktif}
            className={`block w-full rounded-md  text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${aktif ? "bg-[#EEF3FC]" : "hover:bg-[#F8FAFC]"}`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <b className="truncate text-[#1E3A8A]" title={item.nama}>{item.nama}</b>
              <span className={`shrink-0 font-semibold ${!hasilAda ? "text-[#64748B]" : tuntas ? "text-[#15803D]" : "text-[#B45309]"}`}>
                {nilai === null ? "Belum ada data" : `${format(nilai)}% · ${item.jumlahCPMK}/${item.totalCPMK}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className={`h-full rounded-full ${warna}`} style={{ width: `${nilai === null ? 0 : Math.max(0, Math.min(100, nilai))}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function komponenMahasiswa(
  mahasiswa: MahasiswaLaporan,
  items: NilaiKomponenLaporan[],
  tingkat: "CPL" | "CPMK" | "Sub-CPMK",
) {
  return items.map((item) => {
    const hasil = tingkat === "CPL"
      ? mahasiswa.cpl[item.id]
      : tingkat === "CPMK"
        ? mahasiswa.cpmk[item.id]
        : mahasiswa.subCpmk[item.id];
    return {
      ...item,
      nilai: hasil?.nilai ?? 0,
      lengkap: hasil?.lengkap ?? false,
      jumlahData: hasil ? 1 : 0,
      persenTuntas: null,
    };
  });
}

export function LaporanCPLWorkspace({ data }: { data: DataLaporanCPL | null }) {
  const [mahasiswaTerpilihId, setMahasiswaTerpilihId] = useState<string | null>(null);
  const [mataKuliahTerpilihId, setMataKuliahTerpilihId] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [cariMK, setCariMK] = useState("");
  const [cariSub, setCariSub] = useState("");
  const [halaman, setHalaman] = useState(1);
  const mahasiswaTerurut = useMemo(
    () => [...(data?.mahasiswa ?? [])].sort((a, b) => a.nim.localeCompare(b.nim, "id", { numeric: true })),
    [data],
  );
  const mahasiswaAktif =
    mahasiswaTerurut.find((item) => item.id === mahasiswaTerpilihId) ?? mahasiswaTerurut[0] ?? null;
  const mahasiswaTerfilter = useMemo(() => {
    const kueri = cari.trim().toLowerCase();
    return mahasiswaTerurut.filter((item) =>
      !kueri || item.nama.toLowerCase().includes(kueri) || item.nim.toLowerCase().includes(kueri),
    );
  }, [mahasiswaTerurut, cari]);
  const totalHalaman = Math.max(1, Math.ceil(mahasiswaTerfilter.length / 5));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mahasiswaTampil = mahasiswaTerfilter.slice((halamanAktif - 1) * 5, halamanAktif * 5);
  const cplAktif = data && mahasiswaAktif ? komponenMahasiswa(mahasiswaAktif, data.cpl, "CPL") : [];
  const mkAktif = data && mahasiswaAktif
    ? [...data.cpmk.reduce((kelompok, cpmk) => {
        const item = kelompok.get(cpmk.mataKuliahId) ?? {
          id: cpmk.mataKuliahId,
          nama: cpmk.mataKuliahNama,
          totalCPMK: 0,
          jumlahCPMK: 0,
          jumlahNilai: 0,
          totalNilai: 0,
        };
        const hasil = mahasiswaAktif.cpmk[cpmk.id];
        item.totalCPMK += 1;
        if (hasil) {
          item.jumlahCPMK += 1;
          item.jumlahNilai += 1;
          item.totalNilai += hasil.nilai;
        }
        kelompok.set(cpmk.mataKuliahId, item);
        return kelompok;
      }, new Map<string, { id: string; nama: string; totalCPMK: number; jumlahCPMK: number; jumlahNilai: number; totalNilai: number }>()).values()]
        .map((item) => ({
          id: item.id,
          nama: item.nama,
          nilai: item.jumlahNilai ? item.totalNilai / item.jumlahNilai : null,
          jumlahCPMK: item.jumlahCPMK,
          totalCPMK: item.totalCPMK,
        }))
    : [];
  const mkTerpilih = mkAktif.find((item) => item.id === mataKuliahTerpilihId) ?? mkAktif[0] ?? null;
  const mkTerfilter = mkAktif.filter((item) => item.nama.toLowerCase().includes(cariMK.trim().toLowerCase()));
  const subCPMKTerpilih = data && mkTerpilih
    ? data.subCpmk.filter((item) => item.mataKuliahId === mkTerpilih.id)
    : [];
  const subAktif = mahasiswaAktif
    ? komponenMahasiswa(mahasiswaAktif, subCPMKTerpilih, "Sub-CPMK").filter((item) =>
        `${item.kode} ${item.deskripsi}`.toLowerCase().includes(cariSub.trim().toLowerCase()),
      ).map((item) => ({
        ...item,
        kode: item.kode.split(" · ").slice(1).join(" · "),
      }))
    : [];

  return (
    <div className="space-y-4 pb-3 print:space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E3A8A]">Laporan Ketercapaian Mahasiswa</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Ringkasan capaian CPL dan CPMK · T.A. {data?.tahunAjaran.label ?? "belum tersedia"}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto print:hidden">
          <button type="button" onClick={() => window.print()} className="h-10 flex-1 rounded-full border border-[#E5E9F0] bg-white px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:flex-none">
            Ekspor Lengkap (.pdf)
          </button>
          <a href="/api/dosen/laporan/portofolio" className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8] sm:flex-none">
            Matriks Portofolio (.xlsx)
          </a>
        </div>
      </header>

      {!data ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-[#E5E9F0] bg-white p-8 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FC] text-[#1D4ED8]">ⓘ</span>
            <h2 className="mt-3 text-base font-bold text-[#0F172A]">Belum ada data capaian untuk periode ini</h2>
            <p className="mt-1 text-sm text-[#64748B]">Aktifkan Tahun Ajaran dan input nilai untuk melihat laporan ketercapaian.</p>
          </div>
        </section>
      ) : (
        <>
          {mahasiswaTerurut.length === 0 && (
            <div role="status" className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
              Belum ada mahasiswa terdaftar pada Tahun Ajaran ini.
            </div>
          )}

          <Card title="Daftar Mahasiswa" subtitle="Pilih mahasiswa untuk melihat rincian capaian " headerRight={(
              <InputCari
                value={cari}
                onChange={(value) => { setCari(value); setHalaman(1); }}
                placeholder="Cari NIM atau nama..."
                label="Cari NIM atau nama mahasiswa"
              />
          )}>

            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#64748B]">{data.totalMahasiswa} mahasiswa terdaftar</p>

            </div>
            <div className="overflow-x-auto ju">
              <table className="w-full min-w-105 text-left">
                <thead className="bg-[#EEF3FC] text-[11px] font-bold uppercase text-[#334155]">
                  <tr>
                    <th className="w-10 px-3 py-2">No</th>
                    <th className="px-3 py-2">Mahasiswa</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center" title="Rata-rata dari hasil CPL yang tersedia">Rata-rata CPL</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mahasiswaTampil.map((mahasiswa, index) => {
                    const aktif = mahasiswa.id === mahasiswaAktif?.id;
                    return (
                      <tr key={mahasiswa.id} className={`border-b border-[#EDF0F4] ${index % 2 ? "bg-[#F8FAFD]" : "bg-white"}`}>
                        <td className="px-3 py-2 text-xs text-[#64748B]">{(halamanAktif - 1) * 5 + index + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index % 2 ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#DBE7FB] text-[#1D4ED8]"}`}>
                              {inisial(mahasiswa.nama)}
                            </span>
                            <span className="min-w-0">
                              <b className="block truncate text-xs text-[#0F172A]">{mahasiswa.nama}</b>
                              <span className="block font-mono text-[11px] text-[#64748B]">NIM {mahasiswa.nim}</span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">
                          {mahasiswa.rataCPL === null ? "–" : format(mahasiswa.rataCPL)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setMahasiswaTerpilihId(mahasiswa.id)}
                            aria-pressed={aktif}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${aktif ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"}`}
                          >
                            Tampilkan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {mahasiswaTampil.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-xs text-[#64748B]">Tidak ada mahasiswa yang sesuai.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[#64748B]">
                Menampilkan {mahasiswaTerfilter.length ? (halamanAktif - 1) * 5 + 1 : 0}–{Math.min(halamanAktif * 5, mahasiswaTerfilter.length)} dari {mahasiswaTerfilter.length} mahasiswa
              </p>
              <nav aria-label="Halaman mahasiswa" className="flex items-center gap-1">
                <button type="button" onClick={() => setHalaman((value) => Math.max(1, value - 1))} disabled={halamanAktif === 1} className="grid h-7 w-7 place-items-center rounded-full text-sm text-[#475569] disabled:opacity-30">‹</button>
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#2563EB] px-2 text-[11px] font-bold text-white">{halamanAktif}</span>
                <span className="px-1 text-[11px] text-[#64748B]">dari {totalHalaman}</span>
                <button type="button" onClick={() => setHalaman((value) => Math.min(totalHalaman, value + 1))} disabled={halamanAktif === totalHalaman} className="grid h-7 w-7 place-items-center rounded-full text-sm text-[#475569] disabled:opacity-30">›</button>
              </nav>
            </div>
          </Card>

          {mahasiswaAktif ? (
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
              <Card
                title="Ketercapaian CPL"
                subtitle="Nilai CPL mahasiswa terpilih"
                className="xl:col-span-6 "
                headerRight={(
                  <div className="flex min-w-0 shrink-0 items-center pr-5 pt-2 gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#DBE7FB] text-[13px] font-bold text-[#1D4ED8]">{inisial(mahasiswaAktif.nama)}</span>
                    <span className="min-w-0 text-left gap-0">
                      <b className="block -mb-2 max-w-40 truncate text-md text-[#1D4ED8]">{mahasiswaAktif.nama}</b>
                      <span className="font-mono text-[13px] text-[#64748B]">{mahasiswaAktif.nim}</span>
                    </span>
                  </div>
                )}
              >
                <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1.2fr_.8fr]">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center flex-wrap gap-3 text-[11px] text-[#64748B]">
                      <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-[#2563EB]" />Ketercapaian</span>
                      <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 border-t border-dashed border-[#94A3B8]" />Batas {data.passingGrade}</span>
                    </div>
                    <Radar items={cplAktif.map((item) => ({ kode: item.kode, nilai: item.jumlahData ? item.nilai : null }))} threshold={data.passingGrade} />
                  </div>
                  <DaftarNilai items={cplAktif.map((item) => ({ kode: item.kode, nilai: item.jumlahData ? item.nilai : null }))} />
                </div>
              </Card>

              <Card title="Ketercapaian MK" subtitle="Rata-rata seluruh CPMK per mata kuliah" className="xl:col-span-3">
                <div className="mb-3 flex min-w-0 items-center gap-2">
                  <InputCari value={cariMK} onChange={setCariMK} placeholder="Cari mata kuliah..." label="Cari mata kuliah" />
                </div>
                <ProgressMataKuliah
                  items={mkTerfilter}
                  threshold={data.passingGrade}
                  selectedId={mkTerpilih?.id ?? null}
                  onSelect={setMataKuliahTerpilihId}
                />
              </Card>

              <Card title="Ketercapaian Sub-CPMK" subtitle={mkTerpilih ? `${mkTerpilih.nama} · Nilai Sub-CPMK mahasiswa terpilih` : "Pilih mata kuliah untuk melihat Sub-CPMK"} className="xl:col-span-3">
                <div className="mb-3 flex min-w-0 items-center gap-2">
                  <InputCari value={cariSub} onChange={setCariSub} placeholder="Cari Sub-CPMK..." label="Cari Sub-CPMK" />
                </div>
                <ProgressKomponen items={subAktif} threshold={data.passingGrade} />
              </Card>
            </div>
          ) : (
            <section className="grid min-h-48 place-items-center rounded-2xl border border-[#E5E9F0] bg-white p-6 text-center text-xs text-[#64748B]">
              Pilih mahasiswa untuk melihat rincian capaian.
            </section>
          )}
        </>
      )}
    </div>
  );
}
