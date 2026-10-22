import { createHmac, randomInt, timingSafeEqual } from "crypto";

function kunciRahasia(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

/**
 * Hash satu arah untuk kode OTP dan token reset, supaya nilai aslinya tidak tersimpan di database.
 * Memakai HMAC dengan AUTH_SECRET, jadi hash yang bocor tidak bisa ditebak lewat brute force offline.
 */
export function hashRahasia(nilai: string): string {
  return createHmac("sha256", kunciRahasia()).update(nilai).digest("hex");
}

/** Perbandingan string dalam waktu konstan. */
export function samaAman(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Kode OTP 6 digit, 000000 sampai 999999 (semua kombinasi bisa muncul). */
export function buatKodeOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
