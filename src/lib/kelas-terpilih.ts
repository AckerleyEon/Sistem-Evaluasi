// Penanda eksplisit di URL (?kelas=belum) untuk mahasiswa yang belum punya kelas.
// Parameter `kelas` yang TIDAK ada berarti "belum memilih", sehingga default ke kelas pertama.
// Keduanya harus dibedakan, kalau tidak opsi "Belum ditentukan" selalu terlempar ke Kelas A.
export const KELAS_BELUM = "belum";

/**
 * Menentukan kelas yang ditampilkan dari parameter URL.
 * - "belum"              -> null (mahasiswa yang belum punya kelas)
 * - id kelas yang valid  -> kelas itu
 * - kosong / tidak dikenal -> kelas pertama (null bila MK belum punya kelas)
 */
export function pilihKelas<T extends { id: string }>(daftarKelas: T[], param: string | undefined): T | null {
  if (param === KELAS_BELUM) return null;
  return daftarKelas.find((kelas) => kelas.id === param) ?? daftarKelas[0] ?? null;
}
