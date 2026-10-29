// Utilitas murni untuk impor mahasiswa massal: satu file Excel per mata kuliah, kode MK dibaca dari nama file
// (contoh: "UTM_101_Bahasa_Indonesia.xlsx" -> UTM 101).

/** Kunci pembanding kode MK: huruf besar tanpa spasi/garis bawah/tanda hubung. "TEM 713", "tem_713", "TEM713" -> "TEM713". */
export function kunciKodeMK(kode: string): string {
  return kode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export type KodeDariNamaFile = {
  /** Kunci pembanding, mis. "UTM101". */
  kunci: string;
  /** Kode sebagaimana tertulis di file, mis. "UTM_101". */
  kodeAsli: string;
  /** Sisa nama file (judul MK), mis. "Bahasa Indonesia". Bisa kosong. */
  judul: string;
};

/**
 * Membaca kode MK dari awal nama file: 2-4 huruf, pemisah opsional (_ spasi -), lalu 2-4 angka.
 * Mengembalikan null kalau nama file tidak berawalan kode MK.
 */
export function bacaKodeDariNamaFile(namaFile: string): KodeDariNamaFile | null {
  const tanpaFolder = namaFile.split(/[\\/]/).pop() ?? namaFile;
  const tanpaEkstensi = tanpaFolder.replace(/\.xlsx$/i, "").trim();
  const cocok = /^([A-Za-z]{2,4})([\s_-]?)(\d{2,4})(?![A-Za-z0-9])(.*)$/.exec(tanpaEkstensi);
  if (!cocok) return null;
  const [, huruf, pemisah, angka, sisa] = cocok;
  const judul = sisa
    .replace(/\(\d+\)\s*$/, "") // "(1)" dari salinan file di Windows
    .replace(/[_]+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/\s+/g, " ");
  return { kunci: `${huruf}${angka}`.toUpperCase(), kodeAsli: `${huruf}${pemisah}${angka}`, judul };
}

const rapatkan = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]/g, "");

/** True bila judul di nama file (yang mungkin terpotong/disingkat) konsisten dengan nama MK di sistem. */
export function judulCocokDenganNamaMK(judul: string, namaMK: string): boolean {
  const a = rapatkan(judul);
  const b = rapatkan(namaMK);
  if (!a) return true; // tidak ada judul di nama file: tidak ada yang bisa dibandingkan
  return b.startsWith(a) || a.startsWith(b);
}

/** Indeks (0-based) file yang kode MK-nya sudah muncul di file sebelumnya, supaya satu MK tidak diimpor dua kali. */
export function cariFileGanda(kunciPerFile: (string | null)[]): Map<number, number> {
  const pertama = new Map<string, number>();
  const ganda = new Map<number, number>();
  kunciPerFile.forEach((kunci, indeks) => {
    if (!kunci) return;
    const awal = pertama.get(kunci);
    if (awal === undefined) pertama.set(kunci, indeks);
    else ganda.set(indeks, awal);
  });
  return ganda;
}

export type PetaKolomMahasiswa = { nim: number; nama: number; kelas: number | null };

const normalisasiJudul = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Mencari baris judul (NIM + Nama, Kelas opsional) pada beberapa baris pertama lembar, karena file ekspor sering
 * punya judul/keterangan di atas tabel. `matriks[i][j]` = teks sel baris i (0-based), kolom j (0-based).
 */
export function cariHeaderMahasiswa(
  matriks: string[][],
  batasBaris = 15,
): { indeksBaris: number; kolom: PetaKolomMahasiswa } | null {
  for (let i = 0; i < Math.min(matriks.length, batasBaris); i++) {
    const sel = matriks[i].map(normalisasiJudul);
    const nim = sel.findIndex((teks) => teks === "nim" || teks === "npm");
    const nama = sel.findIndex((teks) => teks === "nama" || teks === "namamahasiswa");
    if (nim < 0 || nama < 0) continue;
    const kelas = sel.findIndex((teks) => teks === "kelas");
    return { indeksBaris: i, kolom: { nim, nama, kelas: kelas >= 0 ? kelas : null } };
  }
  return null;
}
