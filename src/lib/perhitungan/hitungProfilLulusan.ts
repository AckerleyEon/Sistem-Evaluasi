import type { HasilHitung } from "./rumus";

export function hitungProfilLulusan(
  hasilCPL: { nilai: number; statusLengkap: boolean }[],
  jumlahCPL: number,
): HasilHitung | null {
  if (jumlahCPL === 0 || hasilCPL.length === 0) return null;
  return {
    nilai: hasilCPL.reduce((jumlah, hasil) => jumlah + hasil.nilai, 0) / hasilCPL.length,
    statusLengkap:
      hasilCPL.length === jumlahCPL && hasilCPL.every((hasil) => hasil.statusLengkap),
  };
}
