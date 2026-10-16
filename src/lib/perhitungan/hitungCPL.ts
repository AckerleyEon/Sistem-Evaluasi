import { rataBerbobot, type HasilHitung } from "./rumus";

// Nilai CPL = rata-rata berbobot hasil CPMK dari semua CPMK yang dipetakan ke CPL itu
// (bobot dari CPMK.bobot).
export function hitungCPL(
  hasilCpmk: { nilai: number; bobot: number; statusLengkap: boolean }[]
): HasilHitung | null {
  if (hasilCpmk.length === 0) return null;
  return {
    nilai: rataBerbobot(hasilCpmk),
    statusLengkap: hasilCpmk.every((h) => h.statusLengkap),
  };
}