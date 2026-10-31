export type StatusTugas = "baru" | "berjalan" | "dinilai" | "belum";

export interface SubOpsi {
  id: string;
  kode: string;
  angka: string;
  deskripsi: string;
}

export interface CpmkOpsi {
  id: string;
  kode: string;
  angka: string;
  deskripsi: string;
  cpl: { kode: string; deskripsi: string }[];
  sub: SubOpsi[];
}

export interface TugasRow {
  id: string;
  kelasId: string;
  kode: string; // "T1", "T2", ... (urutan pembuatan)
  nama: string;
  pertemuanKe: number;
  bobot: number; // persen
  cpmkIds: string[];
  cpmkAngka: string[];
  subAngka: string[];
  subIds: string[];
  masuk: number; // jumlah mahasiswa yang sudah punya nilai
  total: number; // mahasiswa terdaftar
  status: StatusTugas; // "baru" hanya ditentukan di client
}

export interface DataAsesmen {
  mataKuliah: { id: string; kode: string; nama: string; sks: number };
  tahunAjaran: { id: string; label: string; status: "AKTIF" | "ARSIP" };
  daftarMK: { id: string; nama: string }[];
  daftarKelas: { id: string; nama: string }[];
  kelas: { id: string; nama: string };
  koordinator: boolean;
  mahasiswa: number;
  mahasiswaTotal: number;
  dosenNama: string;
  /** Sub-CPMK pada hierarki CPMK: berapa yang sudah terhubung ke minimal satu tugas (seluruh MK pada T.A. ini). */
  distribusiSub: { terpetakan: number; total: number };
  tugas: TugasRow[]; // urut pembuatan (kode T1 -> Tn)
  cpmk: CpmkOpsi[];
  pertemuanDefault: number;
}

export type HasilAksi = { ok: boolean; pesan: string };

export interface RingkasanBuat {
  id: string;
  nama: string;
  bobot: number;
  cpmkAngka: string[];
}
