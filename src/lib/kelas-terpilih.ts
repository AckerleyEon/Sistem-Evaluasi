/**
 * Menentukan kelas yang ditampilkan dari parameter URL.
 * ID valid dipilih; parameter kosong/tidak dikenal memakai kelas pertama.
 */
export function pilihKelas<T extends { id: string }>(daftarKelas: T[], param: string | undefined): T | null {
  return daftarKelas.find((kelas) => kelas.id === param) ?? daftarKelas[0] ?? null;
}
