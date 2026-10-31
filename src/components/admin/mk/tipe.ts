import type { cekDampakHapusMK } from "@/lib/actions/mata-kuliah";

export type MkItem = {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  jumlahMhs: number;
  pjmkId: string | null;
  pjmkNama: string | null;
  cpl: { id: string; kode: string }[];
  kelas: KelasItem[];
  terpakai: boolean;
};

export type KelasItem = { id: string; nama: string; dosenId: string; dosenNama: string; jumlahMhs: number };
export type DosenOpsi = { id: string; nama: string; gelar: string | null; nip: string };
export type MhsItem = { id: string; nama: string; nim: string; angkatan: number; kelasId: string | null; kelasNama: string | null };
export type Dampak = Awaited<ReturnType<typeof cekDampakHapusMK>>;