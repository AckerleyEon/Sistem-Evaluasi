export type PredikatKey = "A" | "B+" | "B" | "C" | "DE";
export type NadaStatus = "hijau" | "biru" | "oranye" | "merah";

export interface TitikAngkatan {
  angkatan: number;
  rata: number | null; // 0-100, null bila belum ada hasil CPL di seluruh T.A.
  jumlah: number; // jumlah hasil CPL (sampel)
}

export interface SegmenPredikat {
  kunci: PredikatKey;
  label: string;
  jumlah: number;
  persen: number;
  warna: string;
}

export interface BarisKesiapan {
  id: string;
  dosen: string;
  inisial: string;
  mataKuliah: string;
  terisi: number;
  total: number;
  persen: number;
  label: string;
  nada: NadaStatus;
}

export interface BarAsesmen {
  label: string;
  jumlah: number;
  aktif: boolean;
}

export interface EntriLog {
  id: string;
  jenis: "nilai" | "rps";
  dosen: string;
  inisial: string;
  teks: string;
  sorot: string;
  waktu: string;
  chip: { teks: string; nada: "biru" | "hijau" | "oranye" };
}

export interface KpiDashboard {
  totalCPL: number;
  rataCPL: number | null;
  totalDosenAktif: number;
  totalDosenAkun: number;
  totalMK: number;
  totalSKS: number;
  totalMahasiswa: number;
  persenLengkap: number | null;
}

export interface DataDashboard {
  tahunAjaran: { id: string; label: string; status: "AKTIF" | "ARSIP" };
  daftarTahunAjaran: { id: string; label: string }[];
  kpi: KpiDashboard;
  angkatan: TitikAngkatan[];
  predikat: SegmenPredikat[];
  totalSampel: number;
  jumlahRemedial: number;
  persenLulus: number | null;
  passingGrade: number;
  histogram: number[]; // 101 elemen: jumlah skor per nilai bulat 0..100
  kesiapan: BarisKesiapan[];
  jumlahDosenPerluPengingat: number;
  asesmen: BarAsesmen[];
  labelBulanAktif: string;
  puncakInput: { nama: string; pertemuanKe: number } | null;
  log: EntriLog[];
}
