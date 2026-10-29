// Fungsi murni untuk tampilan halaman Kelola Asesmen (bisa diuji tanpa React).

export type StatusDistribusi = {
  lengkap: boolean;
  /** Tombol "Distribusikan" hanya berguna jika masih ada Sub-CPMK yang belum terhubung ke tugas. */
  tombolAktif: boolean;
  alasanNonaktif: string | null;
};

export function statusDistribusi(
  terpetakan: number,
  total: number,
  opsi: { adaTugas: boolean; bolehKelola: boolean; arsip: boolean },
): StatusDistribusi {
  const lengkap = total > 0 && terpetakan >= total;
  let alasanNonaktif: string | null = null;
  if (opsi.arsip) alasanNonaktif = "Tahun Ajaran arsip hanya dapat dilihat.";
  else if (!opsi.bolehKelola) alasanNonaktif = "Hanya koordinator mata kuliah yang dapat mendistribusikan Sub-CPMK.";
  else if (total === 0) alasanNonaktif = "Belum ada Sub-CPMK pada mata kuliah ini.";
  else if (lengkap) alasanNonaktif = "Semua Sub-CPMK sudah terdistribusi";
  else if (!opsi.adaTugas) alasanNonaktif = "Buat minimal satu tugas sebelum mendistribusikan Sub-CPMK.";
  return { lengkap, tombolAktif: alasanNonaktif === null, alasanNonaktif };
}

export type LencanaBobot = { teks: string; nada: "biru" | "oranye" | "merah" | "abu" };

/** Badge kanan atas kartu Distribusi Bobot Tugas. */
export function lencanaBobot(totalBobot: number, jumlahTugas: number): LencanaBobot {
  if (jumlahTugas === 0) return { teks: "Belum ada tugas", nada: "abu" };
  const selisih = Math.round((100 - totalBobot) * 10) / 10;
  if (selisih === 0) return { teks: "100% Terpakai", nada: "biru" };
  if (selisih > 0) return { teks: `Kurang ${selisih}%`, nada: "oranye" };
  return { teks: `Lebih ${Math.abs(selisih)}%`, nada: "merah" };
}

export type PosisiCallout = { kiri: number; atas: boolean };

/**
 * Posisi callout pada bar bobot: titik tengah tiap segmen (persen lebar bar) dan sisi bergantian
 * (indeks ganjil di atas, genap di bawah) supaya label segmen sempit tidak saling menimpa.
 */
export function posisiCallout(bobot: number[]): PosisiCallout[] {
  const total = Math.max(bobot.reduce((a, b) => a + b, 0), 100);
  let jalan = 0;
  return bobot.map((b, i) => {
    const kiri = ((jalan + b / 2) / total) * 100;
    jalan += b;
    return { kiri, atas: i % 2 === 1 };
  });
}

/** Sub-CPMK unik (satu Sub-CPMK bisa berada di beberapa CPMK), terurut menurut nomor. */
export function daftarSubUnik<T extends { id: string; angka: string }>(cpmk: { sub: T[] }[]): T[] {
  const peta = new Map<string, T>();
  for (const c of cpmk) for (const s of c.sub) if (!peta.has(s.id)) peta.set(s.id, s);
  return [...peta.values()].sort((a, b) => Number(a.angka) - Number(b.angka));
}
