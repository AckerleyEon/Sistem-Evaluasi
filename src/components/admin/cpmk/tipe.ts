import type { cekDampakCPMK } from "@/lib/actions/cpmk";
import type { cekDampakSub } from "@/lib/actions/sub-cpmk";

export type MkRingkas = { id: string; kode: string; nama: string; sks: number };
export type CplOpsi = { id: string; kode: string };

// Sub-CPMK = komponen mandiri. Kaitannya ke CPMK (beserta bobot) ada di TautanSub.
export type KomponenSub = { id: string; kode: string; deskripsi: string };
export type TautanSub = { cpmkId: string; subCpmkId: string; bobot: number };
export type SubTerkait = KomponenSub & { bobot: number };

export type KomponenCpmk = {
  id: string;
  kode: string;
  deskripsi: string;
  bobot: number;
  mataKuliahId: string | null; // null = belum dikaitkan ke mata kuliah
  cpl: CplOpsi[];
};
export type CpmkTerkait = KomponenCpmk & { sub: SubTerkait[] };

export type DampakCpmk = Awaited<ReturnType<typeof cekDampakCPMK>>;
export type DampakSub = Awaited<ReturnType<typeof cekDampakSub>>;

export function jumlahBobot(daftar: { bobot: number }[]) {
  return daftar.reduce((jumlah, d) => jumlah + d.bobot, 0);
}

export function kodeBerikutnya(awalan: string, daftarKode: string[]) {
  const pola = new RegExp(`^${awalan}-(\\d+)$`);
  let maks = 0;
  for (const k of daftarKode) {
    const m = k.match(pola);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  }
  return `${awalan}-${maks + 1}`;
}