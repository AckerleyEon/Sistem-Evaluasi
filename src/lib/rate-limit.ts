// Pembatas percobaan sederhana di memori proses.
//
// Cukup untuk satu instance server (mis. skripsi / server prodi). Kalau aplikasi dijalankan
// di banyak instance atau serverless, hitungannya tidak dibagi antar-instance; pindahkan
// penyimpanannya ke Redis/DB bila itu kebutuhannya.

type Entri = { jumlah: number; mulai: number; jendelaMs: number };

const global_ = globalThis as unknown as { __batasPercobaan?: Map<string, Entri> };
const penyimpanan: Map<string, Entri> = (global_.__batasPercobaan ??= new Map());

const MAKS_ENTRI = 5000;

function sapuKedaluwarsa(sekarang: number) {
  if (penyimpanan.size < MAKS_ENTRI) return;
  for (const [kunci, e] of penyimpanan) {
    if (sekarang - e.mulai >= e.jendelaMs) penyimpanan.delete(kunci);
  }
}

/** Sisa waktu blokir dalam milidetik. 0 berarti belum mencapai batas. */
export function sisaBlokirMs(kunci: string, maks: number, sekarang = Date.now()): number {
  const e = penyimpanan.get(kunci);
  if (!e) return 0;
  if (sekarang - e.mulai >= e.jendelaMs) {
    penyimpanan.delete(kunci);
    return 0;
  }
  return e.jumlah >= maks ? e.mulai + e.jendelaMs - sekarang : 0;
}

/** Mencatat satu percobaan (gagal) pada jendela waktu tertentu. */
export function catatPercobaan(kunci: string, jendelaMs: number, sekarang = Date.now()): void {
  sapuKedaluwarsa(sekarang);
  const e = penyimpanan.get(kunci);
  if (!e || sekarang - e.mulai >= e.jendelaMs) {
    penyimpanan.set(kunci, { jumlah: 1, mulai: sekarang, jendelaMs });
    return;
  }
  e.jumlah += 1;
}

export function hapusCatatan(kunci: string): void {
  penyimpanan.delete(kunci);
}

export function menitTersisa(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

/** Alamat IP klien dari header proxy. Hanya dipakai sebagai bagian kunci pembatas, bukan untuk otorisasi. */
export function ambilIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "tidak-diketahui";
  return headers.get("x-real-ip")?.trim() || "tidak-diketahui";
}
