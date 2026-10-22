// Logika murni impor MK dari Excel (tanpa Prisma/Next) — dipakai server action dan modal.

export type StatusBaris = "baru" | "diperbarui" | "sama" | "galat";

/** Satu baris Excel apa adanya (semua teks). */
export interface BarisMentah {
  baris: number; // nomor baris di Excel
  dosen: string;
  kode: string;
  nama: string;
  sks: string;
  kelas: string;
  jumlah: string;
  cpl: string;
  cplAdaKolom: boolean;
  cplNilaiValid: boolean;
}

export interface BarisAnalisis {
  baris: number;
  dosenTeks: string;
  dosenId: string | null;
  dosenNama: string | null;
  kode: string;
  nama: string;
  sks: number | null;
  kelas: string[];
  cpl: string[];
  cplIds: string[];
  cplDiatur: boolean;
  status: StatusBaris;
  pesan: string[];
}

export interface RingkasanImpor {
  total: number;
  valid: number;
  galat: number;
  mkBaru: number;
  mkDiperbarui: number;
  kelasBaru: number;
  kelasGantiPengampu: number;
  kelasSama: number;
}

export interface AnalisisImpor {
  tahunAjaran: { id: string; label: string } | null;
  baris: BarisAnalisis[];
  ringkasan: RingkasanImpor;
}

export const MAKS_BARIS = 2000;

const rapikan = (s: string) => s.replace(/\s+/g, " ").trim();
export const huruf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type PetaKolom = {
  dosen: number;
  kode: number;
  nama: number;
  sks: number;
  kelas: number;
  jumlah: number;
  cpl: { kode: string; indeks: number }[];
};

/** Cari nomor kolom berdasarkan judul; kembalikan null bila tidak ada baris judul. */
function petaKolom(baris: string[]): PetaKolom | null {
  const sel = baris.map((c) => c.toLowerCase());
  const cari = (fn: (c: string) => boolean) => sel.findIndex(fn);
  const dosen = cari((c) => c.includes("dosen") || c.includes("pengampu"));
  const kode = cari((c) => c.includes("kode"));
  if (dosen < 0 || kode < 0) return null; // bukan baris judul
  const jumlah = cari((c) => c.includes("jumlah"));
  const kelas = cari((c) => c.includes("kelas") && !c.includes("jumlah"));
  const sks = cari((c) => c.includes("sks"));
  const nama = cari((c) => (c.includes("mata kuliah") || c.includes("matakuliah") || c.includes("nama")) && !c.includes("kode"));
  return {
    dosen,
    kode,
    nama: nama >= 0 ? nama : 3,
    sks: sks >= 0 ? sks : 4,
    kelas: kelas >= 0 ? kelas : 5,
    jumlah: jumlah >= 0 ? jumlah : 6,
    cpl: sel.flatMap((judul, indeks) => {
      const cocok = /^cpl[\s_-]*(\d+)$/i.exec(judul.trim());
      return cocok ? [{ kode: `CPL-${Number(cocok[1])}`, indeks }] : [];
    }),
  };
}

/**
 * Ubah isi lembar (matriks teks) menjadi baris mentah. Judul kolom boleh ada atau tidak;
 * tanpa judul, urutan kolom: Dosen, Kode, Nama MK, SKS, Kelas, Jumlah Kelas.
 * Kolom Semester lama diabaikan ketika header kolom tersedia.
 */
export function bacaMatriks(matriks: string[][]): BarisMentah[] {
  const hasil: BarisMentah[] = [];
  let kolom: PetaKolom = { dosen: 0, kode: 1, nama: 2, sks: 3, kelas: 4, jumlah: 5, cpl: [] };
  matriks.forEach((sel, i) => {
    const teks = sel.map((c) => rapikan(c ?? ""));
    if (teks.every((c) => c === "")) return;
    const judul = petaKolom(teks);
    if (judul) {
      kolom = judul;
      return;
    }
    const ambil = (k: "dosen" | "kode" | "nama" | "sks" | "kelas" | "jumlah") => teks[kolom[k]] ?? "";
    hasil.push({
      baris: i + 1,
      dosen: ambil("dosen"),
      kode: ambil("kode"),
      nama: ambil("nama"),
      sks: ambil("sks"),
      kelas: ambil("kelas"),
      jumlah: ambil("jumlah"),
      cpl: kolom.cpl
        .filter(({ indeks }) => ["1", "x", "true", "ya", "yes"].includes((teks[indeks] ?? "").trim().toLowerCase()))
        .map(({ kode }) => kode)
        .join(","),
      cplAdaKolom: kolom.cpl.length > 0,
      cplNilaiValid: kolom.cpl.every(({ indeks }) =>
        ["", "0", "1", "x", "false", "true", "tidak", "ya", "no", "yes"].includes(
          (teks[indeks] ?? "").trim().toLowerCase(),
        ),
      ),
    });
  });
  return hasil;
}

/** "A/B/C", "A, B", "a" -> ["A","B","C"] (unik, huruf besar). */
export function pecahKelas(teks: string): string[] {
  const unik = new Set(
    teks
      .split(/[\/,;&]|\bdan\b/i)
      .map((k) => rapikan(k).toUpperCase())
      .filter(Boolean),
  );
  return [...unik];
}

export function rapikanKode(kode: string): string {
  return rapikan(kode).toUpperCase();
}

export interface DosenRef {
  id: string;
  nama: string;
  gelar: string | null;
  alias: string | null;
}

/**
 * Cocokkan teks "Nama, S.T., M.T" di Excel dengan data dosen (nama + gelar terpisah).
 * 1) cocok penuh pada huruf/angka saja; 2) nama dosen jadi awalan dan diikuti pemisah.
 */
export function cariDosen(teks: string, daftar: DosenRef[]): DosenRef | null {
  const t = huruf(teks);
  if (!t) return null;
  const penuh = daftar.filter((d) => huruf(d.nama + (d.gelar ?? "")) === t);
  const alias = daftar.filter((d) => d.alias && huruf(d.alias) === t);
  const kandidat = [...new Map([...penuh, ...alias].map((dosen) => [dosen.id, dosen])).values()];
  if (kandidat.length === 1) return kandidat[0];
  if (kandidat.length > 1) return null;

  const mentah = rapikan(teks).toLowerCase();
  const awalan = daftar
    .filter((d) => {
      const n = rapikan(d.nama).toLowerCase();
      return mentah.startsWith(n) && (mentah.length === n.length || !/[a-z0-9]/.test(mentah[n.length]));
    })
    .sort((a, b) => b.nama.length - a.nama.length);
  if (awalan.length === 0) return null;
  if (awalan.length > 1 && awalan[0].nama.length === awalan[1].nama.length) return null; // ambigu
  return awalan[0];
}
