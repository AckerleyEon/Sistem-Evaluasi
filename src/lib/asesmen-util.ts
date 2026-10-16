// Fungsi murni (tanpa dependensi server) — dipakai di server action dan komponen client.

/** Ambil angka di akhir kode: "CPMK-3" -> "3", "Sub-CPMK-12" -> "12". */
export function angkaKode(kode: string): string {
  return kode.match(/(\d+)\s*$/)?.[1] ?? kode;
}

/** Bobot tersimpan sebagai pecahan (0.4) -> persen (40), 1 desimal. */
export function bobotKePersen(bobot: number): number {
  return Math.round(bobot * 1000) / 10;
}

/**
 * Skalakan bobot `lama` (persen) agar totalnya persis `target` (bilangan bulat),
 * memakai metode sisa terbesar supaya jumlahnya tidak meleset karena pembulatan.
 */
export function bagiProporsional(lama: number[], target: number): number[] {
  if (lama.length === 0) return [];
  const total = lama.reduce((a, b) => a + b, 0);
  const mentah = total > 0 ? lama.map((b) => (b / total) * target) : lama.map(() => target / lama.length);
  const dasar = mentah.map(Math.floor);
  let sisa = target - dasar.reduce((a, b) => a + b, 0);
  const urutanSisa = mentah
    .map((m, i) => ({ i, frac: m - Math.floor(m) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of urutanSisa) {
    if (sisa <= 0) break;
    dasar[i]++;
    sisa--;
  }
  return dasar;
}