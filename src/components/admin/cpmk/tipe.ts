import type { cekDampakCPMK } from "@/lib/actions/cpmk";
import type { DampakLepasSub } from "@/lib/actions/sub-cpmk";

export type MkRingkas = { id: string; kode: string; nama: string; sks: number; cpl: CplOpsi[] };
export type CplOpsi = { id: string; kode: string };

// Semua komponen di sini milik satu mata kuliah (yang sedang dipilih).
export type KomponenSub = { id: string; kode: string; deskripsi: string };
export type KomponenCpmk = { id: string; kode: string; deskripsi: string; bobot: number; cpl: CplOpsi[] };
export type TautanSub = { cpmkId: string; subCpmkId: string; bobot: number };

export type SubTerkait = KomponenSub & { bobot: number };
export type CpmkTerkait = KomponenCpmk & { sub: SubTerkait[] };

export type KonteksSub = {
  cpmkId: string;
  cpmkKode: string;
  bobotAwal: number;
  terisiLain: number;
  batas: number;
};

export type DampakCpmk = Awaited<ReturnType<typeof cekDampakCPMK>>;
export type DampakSub = DampakLepasSub;
export type DampakLepas = DampakLepasSub;

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

export function labelKodeCpmk(kode: string) {
  const angka = kode.match(/^CPMK-(?:.*-)?(\d+)$/i)?.[1];
  return angka ? `CPMK-${angka}` : kode;
}

export function labelKodeSub(kode: string) {
  const cocok = kode.match(/^SUB-.*-(\d+)-SUB-(\d+)$/i);
  if (cocok) return `SUB-${cocok[1]}-${cocok[2]}`;
  const angka = kode.match(/^SUB-CPMK-(\d+)$/i)?.[1];
  return angka ? `SUB-${angka}` : kode;
}