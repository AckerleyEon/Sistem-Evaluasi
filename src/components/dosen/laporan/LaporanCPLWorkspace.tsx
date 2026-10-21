"use client";

import { useMemo, useState } from "react";
import type { DataLaporanCPL, MahasiswaLaporan, NilaiKomponenLaporan } from "@/lib/laporan-cpl";

type Tingkat = "CPL" | "CPMK" | "Sub-CPMK";
type Kategori = "A" | "B" | "C" | "D" | "Belum";
type Komponen = NilaiKomponenLaporan & { jumlahMK?: number };

const WARNA_KATEGORI: Record<Kategori, { nama: string; latar: string; teks: string }> = {
  A: { nama: "Sangat Memuaskan (A)", latar: "bg-[#E9F9EF]", teks: "text-[#15803D]" },
  B: { nama: "Memuaskan (B)", latar: "bg-[#EEF3FC]", teks: "text-[#1D4ED8]" },
  C: { nama: "Cukup (C)", latar: "bg-[#FFF8E6]", teks: "text-[#A16207]" },
  D: { nama: "Belum Tercapai (D)", latar: "bg-[#FEECEC]", teks: "text-[#DC2626]" },
  Belum: { nama: "Belum Ada Data", latar: "bg-[#F1F5F9]", teks: "text-[#64748B]" },
};

function format(nilai: number, desimal = 1) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal, minimumFractionDigits: desimal }).format(nilai);
}

function labelMahasiswa(m: MahasiswaLaporan) {
  return m.nama.split(/\s+/).slice(0, 2).map((kata) => kata[0]).join("").toUpperCase();
}

function nilaiMahasiswa(m: MahasiswaLaporan, tingkat: Tingkat, id: string) {
  if (tingkat === "CPL") return m.cpl[id] ?? null;
  if (tingkat === "CPMK") return m.cpmk[id] ?? null;
  return m.subCpmk[id] ?? null;
}

function kategoriMahasiswa(m: MahasiswaLaporan): Kategori {
  if (m.rataCPL === null) return "Belum";
  if (m.rataCPL >= 85) return "A";
  if (m.rataCPL >= 75) return "B";
  if (m.rataCPL >= 65) return "C";
  return "D";
}

function Card({
  title,
  subtitle,
  className = "",
  children,
  dark = false,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ${dark ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E9F0] bg-white"} ${className}`}>
      <div className="mb-3">
        <h2 className={`text-sm font-bold ${dark ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
        <p className={`mt-0.5 text-[10px] ${dark ? "text-white/80" : "text-[#64748B]"}`}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Radar({
  items,
  threshold,
  dark = false,
}: {
  items: { kode: string; nilai: number | null }[];
  threshold: number;
  dark?: boolean;
}) {
  const valid = items.filter((item) => item.nilai !== null);
  if (valid.length < 3) {
    return (
      <div className={`grid min-h-44 place-items-center text-center text-xs ${dark ? "text-white/75" : "text-[#64748B]"}`}>
        Belum cukup data (minimal 3 indikator) untuk membentuk radar.
      </div>
    );
  }
  const width = 270;
  const height = 218;
  const cx = 125;
  const cy = 108;
  const radius = 73;
  const angle = (index: number) => (-Math.PI / 2) + (index * 2 * Math.PI) / valid.length;
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
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafik radar: ${valid.map((item) => `${item.kode} ${format(item.nilai!)}`).join(", ")}`} className="h-52 w-full overflow-visible">
      {[20, 40, 60, 80, 100].map((ring) => (
        <polygon
          key={ring}
          points={valid.map((_, index) => {
            const p = point(index, ring);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke={dark ? "rgba(255,255,255,.3)" : "#CBD5E1"}
          strokeWidth="1"
        />
      ))}
      {valid.map((_, index) => {
        const p = point(index, 100);
        return <line key={index} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={dark ? "rgba(255,255,255,.3)" : "#CBD5E1"} />;
      })}
      <polygon
        points={polygon(() => threshold)}
        fill="none"
        stroke={dark ? "#F59E0B" : "#94A3B8"}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <polygon
        points={polygon((item) => item.nilai ?? 0)}
        fill={dark ? "rgba(255,255,255,.16)" : "rgba(37,99,235,.18)"}
        stroke={dark ? "#FFFFFF" : "#2563EB"}
        strokeWidth="2"
      />
      {valid.map((item, index) => {
        const p = point(index, item.nilai ?? 0);
        const label = point(index, 119);
        return (
          <g key={item.kode}>
            <circle cx={p.x} cy={p.y} r="3" fill={dark ? "#fff" : "#2563EB"} />
            <text x={label.x} y={label.y + 3} textAnchor="middle" fontSize="9" fontWeight="600" fill={dark ? "#fff" : "#64748B"}>
              {item.kode}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DaftarNilai({ items, dark = false }: { items: { kode: string; nilai: number | null }[]; dark?: boolean }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.kode} className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[10px] ${dark ? "bg-white text-[#1D4ED8]" : "bg-[#EEF3FC] text-[#334155]"}`}>
          <span className="truncate">{item.kode}</span>
          <b className="shrink-0">{item.nilai === null ? "–" : format(item.nilai)}</b>
        </div>
      ))}
      {items.length === 0 && <p className={`py-8 text-center text-xs ${dark ? "text-white/75" : "text-[#64748B]"}`}>Belum ada komponen.</p>}
    </div>
  );
}

function TabTingkat({
  value,
  onChange,
  dark = false,
}: {
  value: Tingkat;
  onChange: (value: Tingkat) => void;
  dark?: boolean;
}) {
  return (
    <div role="tablist" aria-label="Tingkat capaian" className={`inline-flex rounded-full p-1 ${dark ? "bg-white/15" : "bg-[#F1F5F9]"}`}>
      {(["CPL", "CPMK", "Sub-CPMK"] as const).map((tingkat) => (
        <button
          key={tingkat}
          type="button"
          role="tab"
          aria-selected={value === tingkat}
          onClick={() => onChange(tingkat)}
          className={`rounded-full px-2.5 py-1 text-[9px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${
            value === tingkat
              ? dark ? "bg-white text-[#1D4ED8]" : "bg-white text-[#1D4ED8] shadow-sm"
              : dark ? "text-white/80 hover:bg-white/10" : "text-[#64748B] hover:bg-white"
          }`}
        >
          {tingkat}
        </button>
      ))}
    </div>
  );
}

function ProgressKomponen({ items, threshold, aggregate }: { items: NilaiKomponenLaporan[]; threshold: number; aggregate: boolean }) {
  if (items.length === 0) return <p className="py-10 text-center text-xs text-[#64748B]">Belum ada data komponen.</p>;
  return (
    <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
      {items.map((item) => {
        const tuntas = item.nilai >= threshold;
        const color = item.nilai < 60 ? "bg-[#DC2626]" : item.nilai < 75 ? "bg-[#F59E0B]" : "bg-[#2563EB]";
        return (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <b className="truncate text-[#0F172A]" title={item.kode}>{item.kode}</b>
              <span className={tuntas ? "shrink-0 font-semibold text-[#15803D]" : "shrink-0 font-semibold text-[#B45309]"}>
                {item.jumlahData === 0
                  ? "Belum ada data"
                  : aggregate
                    ? `${Math.round(item.persenTuntas ?? 0)}% Tuntas`
                    : `${Math.round(item.nilai)}% ${tuntas ? "Tuntas" : "Belum Tuntas"}`}
              </span>
            </div>
            <p className="truncate text-[9px] text-[#64748B]" title={item.cpl.join(", ")}>
              Pemenuhan {item.cpl.join(", ") || "CPL belum dipetakan"} · Rata-rata {item.jumlahData > 0 ? format(item.nilai) : "–"}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8ECF3]">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, aggregate ? item.persenTuntas ?? 0 : item.nilai)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VisualNilai({
  items,
  tingkat,
  threshold,
  dark = false,
}: {
  items: NilaiKomponenLaporan[];
  tingkat: Tingkat;
  threshold: number;
  dark?: boolean;
}) {
  if (tingkat !== "CPL") return <ProgressKomponen items={items} threshold={threshold} aggregate={dark} />;
  const nilai = items.map((item) => ({ kode: item.kode, nilai: item.jumlahData > 0 ? item.nilai : null }));
  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1.2fr_.8fr]">
      <div className="min-w-0">
        <div className={`mb-1 flex flex-wrap gap-3 text-[9px] ${dark ? "text-white/90" : "text-[#64748B]"}`}>
          <span className="flex items-center gap-1.5"><i className={`h-0.5 w-4 ${dark ? "bg-white" : "bg-[#2563EB]"}`} />Ketercapaian</span>
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 border-t border-dashed border-[#F59E0B]" />Batas bawah {threshold}</span>
        </div>
        <Radar items={nilai} threshold={threshold} dark={dark} />
      </div>
      <DaftarNilai items={nilai} dark={dark} />
    </div>
  );
}

function BarKebercakupan({ data }: { data: Komponen[] }) {
  const max = Math.max(1, ...data.map((item) => item.jumlahMK ?? 0));
  return (
    <div className="relative flex h-48 items-end justify-around gap-2 px-1 pb-6 pt-7" role="img" aria-label={`Jumlah mata kuliah per CPL: ${data.map((item) => `${item.kode} ${item.jumlahMK ?? 0} mata kuliah`).join(", ")}`}>
      <div className="pointer-events-none absolute right-1 top-0 grid h-7 w-7 place-items-center rounded-full bg-[#1D4ED8] text-white shadow-[0_0_30px_rgba(37,99,235,.2)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        </svg>
      </div>
      {data.map((item) => {
        const value = item.jumlahMK ?? 0;
        return (
          <div key={item.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[9px] font-semibold text-[#2563EB]">{value}</span>
            <div
              className="w-full max-w-7 rounded-t-md bg-[#2563EB] transition-[height] duration-300"
              style={{ height: `${Math.max(value ? 5 : 0, (value / max) * 112)}px` }}
              title={`${item.kode} · ${value} mata kuliah`}
            />
            <span className="text-[9px] font-medium text-[#1D4ED8]">{item.kode.replace("-", " ")}</span>
          </div>
        );
      })}
      {data.length === 0 && <p className="absolute inset-0 grid place-items-center text-xs text-[#64748B]">Belum ada data CPL.</p>}
    </div>
  );
}

function MappingNetwork({
  data,
  selectedCpl,
  onSelectCpl,
}: {
  data: DataLaporanCPL;
  selectedCpl: string | null;
  onSelectCpl: (id: string | null) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<"jaringan" | "daftar">("jaringan");
  const nodeHeight = 25;
  const colX = [18, 252, 492];
  const svgHeight = Math.max(250, ...[data.cpl.length, data.cpmk.length, data.subCpmk.length].map((count) => count * 36 + 20));
  const positions = {
    cpl: new Map(data.cpl.map((item, i) => [item.id, { x: colX[0], y: 12 + i * ((svgHeight - 24) / Math.max(1, data.cpl.length)) }])),
    cpmk: new Map(data.cpmk.map((item, i) => [item.id, { x: colX[1], y: 12 + i * ((svgHeight - 24) / Math.max(1, data.cpmk.length)) }])),
    sub: new Map(data.subCpmk.map((item, i) => [item.id, { x: colX[2], y: 12 + i * ((svgHeight - 24) / Math.max(1, data.subCpmk.length)) }])),
  };
  const relatedCpmk = new Set(data.relasi.filter((relasi) => relasi.cplId === selectedCpl).map((relasi) => relasi.cpmkId));
  const relatedSub = new Set(data.relasi.filter((relasi) => relasi.cplId === selectedCpl).map((relasi) => relasi.subCpmkId));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[9px] text-[#64748B]">Pilih node CPL untuk menyorot alur terkait.</span>
        <div className="flex items-center gap-1">
          {mode === "jaringan" && (
            <>
              <button type="button" aria-label="Perbesar diagram" onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))} className="grid h-7 w-7 place-items-center rounded-lg border border-[#E5E9F0] text-xs text-[#475569] hover:bg-[#EEF3FC]">+</button>
              <button type="button" aria-label="Perkecil diagram" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} className="grid h-7 w-7 place-items-center rounded-lg border border-[#E5E9F0] text-xs text-[#475569] hover:bg-[#EEF3FC]">−</button>
              <button type="button" aria-label="Sesuaikan diagram" onClick={() => setZoom(1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#E5E9F0] text-[#475569] hover:bg-[#EEF3FC]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            </>
          )}
          <button type="button" onClick={() => setMode((value) => value === "jaringan" ? "daftar" : "jaringan")} className="h-7 rounded-full bg-[#EEF3FC] px-3 text-[9px] font-semibold text-[#1D4ED8]">
            {mode === "jaringan" ? "Mode Alur Jaringan" : "Mode Daftar Relasi"}
          </button>
        </div>
      </div>
      {mode === "daftar" ? (
        <div className="max-h-52 space-y-1 overflow-auto rounded-lg bg-[#F8FAFC] p-2 text-[9px]">
          {data.relasi.map((relasi, index) => (
            <p key={`${relasi.cplId}-${relasi.cpmkId}-${relasi.subCpmkId}-${index}`} className="rounded bg-white px-2 py-1 text-[#475569]">
              {data.cpl.find((item) => item.id === relasi.cplId)?.kode} → {data.cpmk.find((item) => item.id === relasi.cpmkId)?.kode} → {data.subCpmk.find((item) => item.id === relasi.subCpmkId)?.kode}
            </p>
          ))}
          {data.relasi.length === 0 && <p className="p-3 text-center text-[#64748B]">Belum ada relasi CPL → CPMK → Sub-CPMK.</p>}
        </div>
      ) : (
        <div className="max-h-56 overflow-auto rounded-lg bg-[#FBFCFE]">
          {data.cpl.length === 0 && <p className="p-8 text-center text-xs text-[#64748B]">Belum ada CPL untuk ditampilkan.</p>}
          <svg viewBox={`0 0 640 ${svgHeight}`} style={{ width: `${640 * zoom}px`, height: `${svgHeight * zoom}px` }} className="max-w-none transition-[width,height] duration-200" role="img" aria-label="Diagram relasi CPL ke CPMK dan Sub-CPMK">
              {data.relasi.map((relasi, index) => {
                const fromCpl = positions.cpl.get(relasi.cplId);
                const midCpmk = positions.cpmk.get(relasi.cpmkId);
                const toSub = positions.sub.get(relasi.subCpmkId);
                if (!fromCpl || !midCpmk || !toSub) return null;
                const aktif = selectedCpl === null || selectedCpl === relasi.cplId;
                const d1 = `M ${fromCpl.x + 86} ${fromCpl.y + nodeHeight / 2} C 150 ${fromCpl.y + nodeHeight / 2}, 180 ${midCpmk.y + nodeHeight / 2}, ${midCpmk.x} ${midCpmk.y + nodeHeight / 2}`;
                const d2 = `M ${midCpmk.x + 100} ${midCpmk.y + nodeHeight / 2} C 405 ${midCpmk.y + nodeHeight / 2}, 430 ${toSub.y + nodeHeight / 2}, ${toSub.x} ${toSub.y + nodeHeight / 2}`;
                return (
                  <g key={`${relasi.cplId}-${relasi.cpmkId}-${relasi.subCpmkId}-${index}`} opacity={aktif ? 0.9 : 0.14}>
                    <path d={d1} fill="none" stroke={aktif && selectedCpl ? "#1D4ED8" : "#CBD5E1"} strokeWidth={aktif && selectedCpl ? 1.8 : 1} strokeDasharray={selectedCpl ? undefined : "3 4"} />
                    <path d={d2} fill="none" stroke={aktif && selectedCpl ? "#1D4ED8" : "#CBD5E1"} strokeWidth={aktif && selectedCpl ? 1.8 : 1} strokeDasharray={selectedCpl ? undefined : "3 4"} />
                  </g>
                );
              })}
              {data.cpl.map((item, index) => {
                const pos = positions.cpl.get(item.id)!;
                const active = selectedCpl === item.id;
                return (
                  <g key={item.id} role="button" tabIndex={0} aria-label={`Pilih ${item.kode}`} onClick={() => onSelectCpl(active ? null : item.id)} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelectCpl(active ? null : item.id);
                  }} className="cursor-pointer">
                    <title>{`${item.kode}: ${item.deskripsi} · rata-rata ${item.nilai ? format(item.nilai) : "belum ada data"}`}</title>
                    <rect x={pos.x} y={pos.y} width="86" height={nodeHeight} rx="6" fill={active ? "#1D4ED8" : "#EEF3FC"} stroke={active ? "#1D4ED8" : "#CBD5E1"} />
                    <text x={pos.x + 8} y={pos.y + 16} fontSize="9" fontWeight="700" fill={active ? "#fff" : "#334155"}>{String(index + 1).padStart(2, "0")} · {item.kode}</text>
                  </g>
                );
              })}
              {data.cpmk.map((item) => {
                const pos = positions.cpmk.get(item.id)!;
                const active = selectedCpl === null || relatedCpmk.has(item.id);
                return (
                  <g key={item.id} opacity={active ? 1 : 0.35}>
                    <title>{`${item.kode}: ${item.deskripsi} · rata-rata ${item.nilai ? format(item.nilai) : "belum ada data"}`}</title>
                    <rect x={pos.x} y={pos.y} width="100" height={nodeHeight} rx="6" fill={selectedCpl && active ? "#2563EB" : "#F8FAFC"} stroke={selectedCpl && active ? "#2563EB" : "#CBD5E1"} />
                    <text x={pos.x + 8} y={pos.y + 16} fontSize="9" fontWeight="600" fill={selectedCpl && active ? "#fff" : "#475569"}>{item.kode}</text>
                  </g>
                );
              })}
              {data.subCpmk.map((item) => {
                const pos = positions.sub.get(item.id)!;
                const active = selectedCpl === null || relatedSub.has(item.id);
                return (
                  <g key={item.id} opacity={active ? 1 : 0.35}>
                    <title>{`${item.kode}: ${item.deskripsi} · rata-rata ${item.nilai ? format(item.nilai) : "belum ada data"}`}</title>
                    <rect x={pos.x} y={pos.y} width="126" height={nodeHeight} rx="6" fill={selectedCpl && active ? "#2563EB" : "#F8FAFC"} stroke={selectedCpl && active ? "#2563EB" : "#CBD5E1"} />
                    <text x={pos.x + 8} y={pos.y + 16} fontSize="9" fontWeight="600" fill={selectedCpl && active ? "#fff" : "#475569"}>{item.kode}</text>
                  </g>
                );
              })}
          </svg>
        </div>
      )}
      <div className="mt-2 flex justify-between text-[9px] font-semibold text-[#64748B]">
        <span>CPL · {data.cpl.length}</span><span>CPMK · {data.cpmk.length}</span><span>Sub-CPMK · {data.subCpmk.length}</span>
      </div>
    </div>
  );
}

function visualPerMahasiswa(mahasiswa: MahasiswaLaporan, tingkat: Tingkat, data: DataLaporanCPL): NilaiKomponenLaporan[] {
  const master = tingkat === "CPL" ? data.cpl : tingkat === "CPMK" ? data.cpmk : data.subCpmk;
  return master.map((item) => {
    const hasil = nilaiMahasiswa(mahasiswa, tingkat, item.id);
    return {
      id: item.id,
      kode: item.kode,
      deskripsi: item.deskripsi,
      nilai: hasil?.nilai ?? 0,
      lengkap: hasil?.lengkap ?? false,
      cpl: item.cpl,
      jumlahData: hasil ? 1 : 0,
      persenTuntas: null,
    };
  });
}

function visualProdi(data: DataLaporanCPL, tingkat: Tingkat): NilaiKomponenLaporan[] {
  return (tingkat === "CPL" ? data.cpl : tingkat === "CPMK" ? data.cpmk : data.subCpmk).map((item) => item);
}

export function LaporanCPLWorkspace({ data }: { data: DataLaporanCPL | null }) {
  const [mahasiswaTerpilihId, setMahasiswaTerpilihId] = useState<string | null>(null);
  const [tingkatMahasiswa, setTingkatMahasiswa] = useState<Tingkat>("CPL");
  const [tingkatProdi, setTingkatProdi] = useState<Tingkat>("CPL");
  const [cari, setCari] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | null>(null);
  const [halaman, setHalaman] = useState(1);
  const [cplTerpilih, setCplTerpilih] = useState<string | null>(null);

  const mahasiswaTerurut = useMemo(() => [...(data?.mahasiswa ?? [])].sort((a, b) => a.nim.localeCompare(b.nim, "id", { numeric: true })), [data]);
  const mahasiswaAktif = mahasiswaTerurut.find((item) => item.id === mahasiswaTerpilihId) ?? mahasiswaTerurut[0] ?? null;
  const mahasiswaTerfilter = useMemo(() => mahasiswaTerurut.filter((item) => {
    const cocokCari = !cari.trim() || item.nama.toLowerCase().includes(cari.trim().toLowerCase()) || item.nim.toLowerCase().includes(cari.trim().toLowerCase());
    return cocokCari && (!kategoriFilter || kategoriMahasiswa(item) === kategoriFilter);
  }), [mahasiswaTerurut, cari, kategoriFilter]);
  const totalHalaman = Math.max(1, Math.ceil(mahasiswaTerfilter.length / 5));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mahasiswaTampil = mahasiswaTerfilter.slice((halamanAktif - 1) * 5, halamanAktif * 5);
  const komponenMahasiswa = data && mahasiswaAktif ? visualPerMahasiswa(mahasiswaAktif, tingkatMahasiswa, data) : [];
  const komponenProdi = data ? visualProdi(data, tingkatProdi) : [];
  const nilaiTersedia = data?.mahasiswa.filter((item) => item.rataCPL !== null) ?? [];
  const kategoriCounts: Record<Kategori, number> = { A: 0, B: 0, C: 0, D: 0, Belum: 0 };
  for (const mahasiswa of data?.mahasiswa ?? []) kategoriCounts[kategoriMahasiswa(mahasiswa)] += 1;
  const distribusiKeys: Kategori[] = ["A", "B", "C", "D"];
  const denominatorDistribusi = distribusiKeys.reduce((jumlah, key) => jumlah + kategoriCounts[key], 0);
  const exportHref = "/api/dosen/laporan/portofolio";

  function pilihKategori(kategori: Kategori) {
    setKategoriFilter((sebelumnya) => sebelumnya === kategori ? null : kategori);
    setHalaman(1);
  }

  function pagination() {
    const hasil: (number | "…")[] = [];
    const angka = [...new Set([1, totalHalaman, halamanAktif - 1, halamanAktif, halamanAktif + 1])]
      .filter((item) => item >= 1 && item <= totalHalaman)
      .sort((a, b) => a - b);
    angka.forEach((item, index) => {
      if (index > 0 && item - angka[index - 1] > 1) hasil.push("…");
      hasil.push(item);
    });
    return hasil;
  }

  return (
    <div className="space-y-4 pb-3 print:space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3 print:mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">Laporan &amp; Evaluasi Ketercapaian CPL</h1>
          <p className="mt-1 text-xs text-[#64748B]">Analisis performa Capaian Pembelajaran Lulusan (CPL) dan CPMK · T.A. {data?.tahunAjaran.label ?? "belum tersedia"}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto print:hidden">
          <button type="button" onClick={() => window.print()} className="h-9 flex-1 rounded-xl border border-[#E5E9F0] bg-white px-3 text-[10px] font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:flex-none">
            Ekspor Lengkap (.pdf)
          </button>
          <a href={exportHref} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-[#1D4ED8] px-3 text-[10px] font-semibold text-white hover:bg-[#1E40AF] sm:flex-none">
            Matriks Portofolio (.xlsx)
          </a>
        </div>
      </header>

      {!data ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-[#E5E9F0] bg-white p-8 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FC] text-[#1D4ED8]">ⓘ</span>
            <h2 className="mt-3 text-base font-bold text-[#0F172A]">Belum ada data capaian untuk periode ini</h2>
            <p className="mt-1 text-xs text-[#64748B]">Aktifkan Tahun Ajaran dan input nilai untuk melihat laporan ketercapaian.</p>
          </div>
        </section>
      ) : (
        <>
          {nilaiTersedia.length === 0 && (
            <div role="status" className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
              Belum ada data capaian untuk periode ini. Diagram pemetaan dan jumlah cakupan ditampilkan dari kurikulum; nilai mahasiswa muncul setelah nilai tugas dihitung.
            </div>
          )}

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <Card title="Kebercakupan" subtitle="Jumlah mata kuliah setiap CPL" className="xl:col-span-5">
              <BarKebercakupan data={data.cpl} />
              <table className="sr-only">
                <caption>Jumlah mata kuliah yang memetakan setiap CPL</caption>
                <thead><tr><th>CPL</th><th>Jumlah MK</th></tr></thead>
                <tbody>{data.cpl.map((item) => <tr key={item.id}><td>{item.kode}</td><td>{item.jumlahMK}</td></tr>)}</tbody>
              </table>
            </Card>

            <Card title="Pemetaan Capaian" subtitle="Diagram konektivitas komponen" className="xl:col-span-7">
              <MappingNetwork data={data} selectedCpl={cplTerpilih} onSelectCpl={setCplTerpilih} />
            </Card>

            <Card title="Kedalaman" subtitle="Rincian ketercapaian setiap mahasiswa" className="xl:col-span-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Cari NIM atau nama mahasiswa</span>
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]">⌕</span>
                  <input value={cari} onChange={(event) => { setCari(event.target.value); setHalaman(1); }} placeholder="Cari NIM atau Nama..." className="h-8 w-full rounded-lg bg-[#EEF3FC] pl-8 pr-2 text-[10px] outline-none focus:ring-2 focus:ring-[#2563EB]/30" />
                </label>
                {kategoriFilter && <button type="button" onClick={() => pilihKategori(kategoriFilter)} className="text-[9px] font-semibold text-[#1D4ED8]">Hapus filter</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-80 text-left">
                  <thead className="bg-[#EEF3FC] text-[9px] font-bold uppercase text-[#475569]">
                    <tr><th className="px-2 py-2">No</th><th className="px-2 py-2">Mahasiswa</th><th className="px-2 py-2 text-right">Aksi</th></tr>
                  </thead>
                  <tbody>
                    {mahasiswaTampil.map((m, index) => {
                      const aktif = m.id === mahasiswaAktif?.id;
                      return (
                        <tr key={m.id} className="border-b border-[#EDF0F4] hover:bg-[#F8FAFD]">
                          <td className="w-7 px-2 py-2 text-[9px] text-[#64748B]">{(halamanAktif - 1) * 5 + index + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[8px] font-bold ${["bg-[#DBE7FB] text-[#1D4ED8]", "bg-[#DCFCE7] text-[#15803D]", "bg-[#F3E8FF] text-[#7E22CE]", "bg-[#FEF3C7] text-[#A16207]"][index % 4]}`}>{labelMahasiswa(m)}</span>
                              <span className="min-w-0"><b className="block truncate text-[10px] text-[#0F172A]">{m.nama}</b><span className="block font-mono text-[8px] text-[#94A3B8]">{m.nim}</span></span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => setMahasiswaTerpilihId(m.id)} aria-pressed={aktif} className={`rounded-full px-3 py-1 text-[9px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${aktif ? "border border-[#C9D8F7] bg-[#EEF3FC] text-[#1D4ED8]" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"}`}>
                              Tampilkan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {mahasiswaTampil.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-[10px] text-[#64748B]">Tidak ada mahasiswa yang sesuai.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[9px] text-[#64748B]">Menampilkan {mahasiswaTerfilter.length ? (halamanAktif - 1) * 5 + 1 : 0}–{Math.min(halamanAktif * 5, mahasiswaTerfilter.length)} dari {mahasiswaTerfilter.length} mahasiswa</p>
                <nav aria-label="Halaman mahasiswa" className="flex items-center gap-0.5">
                  <button type="button" onClick={() => setHalaman((value) => Math.max(1, value - 1))} disabled={halamanAktif === 1} className="grid h-6 w-6 place-items-center rounded text-xs text-[#475569] disabled:opacity-30">‹</button>
                  {pagination().map((nomor, index) => typeof nomor === "number" ? (
                    <button key={nomor} type="button" onClick={() => setHalaman(nomor)} aria-current={nomor === halamanAktif ? "page" : undefined} className={`grid h-6 min-w-6 place-items-center rounded px-1 text-[9px] ${nomor === halamanAktif ? "bg-[#2563EB] font-bold text-white" : "text-[#475569] hover:bg-[#EEF3FC]"}`}>{nomor}</button>
                  ) : <span key={`ellipsis-${index}`} className="px-1 text-[9px] text-[#94A3B8]">…</span>)}
                  <button type="button" onClick={() => setHalaman((value) => Math.min(totalHalaman, value + 1))} disabled={halamanAktif === totalHalaman} className="grid h-6 w-6 place-items-center rounded text-xs text-[#475569] disabled:opacity-30">›</button>
                </nav>
              </div>
            </Card>

            <Card title="Visualisasi Ketercapaian Setiap Mahasiswa" subtitle="Nilai capaian mahasiswa terpilih" className="xl:col-span-7">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {mahasiswaAktif ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#DBE7FB] text-[9px] font-bold text-[#1D4ED8]">{labelMahasiswa(mahasiswaAktif)}</span>
                    <span className="min-w-0"><b className="block truncate text-[10px] text-[#1D4ED8]">{mahasiswaAktif.nama}</b><span className="block font-mono text-[8px] text-[#64748B]">{mahasiswaAktif.nim}</span></span>
                  </div>
                ) : <span className="text-[10px] text-[#64748B]">Belum ada mahasiswa.</span>}
                <TabTingkat value={tingkatMahasiswa} onChange={setTingkatMahasiswa} />
              </div>
              {mahasiswaAktif
                ? <VisualNilai items={komponenMahasiswa} tingkat={tingkatMahasiswa} threshold={data.passingGrade} />
                : <p className="grid min-h-48 place-items-center text-xs text-[#64748B]">Belum ada data capaian mahasiswa.</p>}
            </Card>

            <Card title="Kebermanfaatan" subtitle={`Hasil capaian prodi pada T.A. ${data.tahunAjaran.label} · ${nilaiTersedia.length} mahasiswa dengan hasil CPL`} className="xl:col-span-7" dark>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-3 text-[9px] text-white/90"><span>— Batas Bawah</span><span>━ Ketercapaian</span></div>
                <TabTingkat value={tingkatProdi} onChange={setTingkatProdi} dark />
              </div>
              <VisualNilai items={komponenProdi} tingkat={tingkatProdi} threshold={data.passingGrade} dark />
            </Card>

            <Card title="Distribusi Kategori Mutu CPL" subtitle={`${denominatorDistribusi} mahasiswa memiliki nilai CPL`} className="xl:col-span-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
                {distribusiKeys.map((key) => {
                  const style = WARNA_KATEGORI[key];
                  const jumlah = kategoriCounts[key];
                  const persentase = denominatorDistribusi ? Math.round((jumlah / denominatorDistribusi) * 100) : 0;
                  return (
                    <button key={key} type="button" onClick={() => pilihKategori(key)} aria-pressed={kategoriFilter === key} className={`min-h-20 rounded-xl p-3 text-left transition hover:ring-2 hover:ring-[#2563EB]/30 ${style.latar} ${kategoriFilter === key ? "ring-2 ring-[#2563EB]" : ""}`}>
                      <span className={`flex items-center justify-between gap-1 text-[9px] font-semibold ${style.teks}`}><span>{style.nama}</span><span>{persentase}%</span></span>
                      <span className={`mt-1 block text-xl font-bold ${style.teks}`}>{jumlah} <small className="text-[9px] font-medium">Mhs</small></span>
                    </button>
                  );
                })}
              </div>
              {kategoriCounts.Belum > 0 && <p className="mt-2 text-[9px] text-[#64748B]">{kategoriCounts.Belum} mahasiswa belum memiliki hasil CPL.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
