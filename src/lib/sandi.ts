// Aturan kata sandi. Tanpa dependensi server supaya aman dipakai di komponen client juga.

export const MIN_SANDI = 8;
export const MAKS_SANDI = 64;

/** Mengembalikan pesan galat, atau null kalau kata sandi memenuhi aturan. */
export function validasiSandi(sandi: string, konfirmasi?: string): string | null {
  if (!sandi || sandi.length < MIN_SANDI) return `Kata sandi minimal ${MIN_SANDI} karakter.`;
  if (sandi.length > MAKS_SANDI) return `Kata sandi maksimal ${MAKS_SANDI} karakter.`;
  if (konfirmasi !== undefined && sandi !== konfirmasi) return "Konfirmasi kata sandi tidak cocok.";
  return null;
}
