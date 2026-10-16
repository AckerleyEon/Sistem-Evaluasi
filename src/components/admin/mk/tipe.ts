import type { cekDampakHapusMK } from "@/lib/actions/mata-kuliah";

export type MkItem = {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  jumlahMhs: number;
  pjmkId: string | null;
  pjmkNama: string | null;
  terpakai: boolean;
};

export type DosenOpsi = { id: string; nama: string; gelar: string | null; nip: string };
export type MhsItem = { id: string; nama: string; nim: string; angkatan: number };
export type Dampak = Awaited<ReturnType<typeof cekDampakHapusMK>>;