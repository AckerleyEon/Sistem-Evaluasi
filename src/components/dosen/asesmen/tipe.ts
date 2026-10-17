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
  kelasId: string | null;
  kode: string; // "T1", "T2", ... (urutan pembuatan)
  nama: string;
  pertemuanKe: number;
  bobot: number; // persen
  cpmkIds: string[];
  cpmkAngka: string[];
  subAngka: string[];
  masuk: number; // jumlah mahasiswa yang sudah punya nilai
  total: number; // mahasiswa terdaftar
  status: StatusTugas; // "baru" hanya ditentukan di client
}

export interface DataAsesmen {
  mataKuliah: { id: string; kode: string; nama: string; sks: number };
  tahunAjaran: { id: string; label: string };
  daftarMK: { id: string; nama: string }[];
  daftarKelas: { id: string; nama: string }[];
  kelas: { id: string; nama: string } | null;
  koordinator: boolean;
  mahasiswa: number;
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
