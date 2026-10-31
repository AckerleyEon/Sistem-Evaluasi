export const BATAS_IMPOR_NILAI = {
  jumlahFile: 20,
  ukuranPerFile: 5 * 1024 * 1024,
  ukuranTotal: 20 * 1024 * 1024,
  jumlahBaris: 10_000,
} as const;

export const KOLOM_NILAI_MASSAL = ["Kelas", "NIM", "Nama Mahasiswa", "Nilai"] as const;

function slugNamaFile(teks: string): string {
  return teks
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buatNamaFileNilai(kodeMataKuliah: string, namaMataKuliah: string): string {
  return `${slugNamaFile(kodeMataKuliah)}_${slugNamaFile(namaMataKuliah)}_nilai.xlsx`;
}

export function namaFileNilaiSesuai(
  namaFile: string,
  kodeMataKuliah: string,
  namaMataKuliah: string,
): boolean {
  const identitas = namaFile.match(/^([^_]+)_(.+)_nilai\.xlsx$/i);
  if (!identitas) return false;
  const normalisasiIdentitas = (teks: string) =>
    teks.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id").replace(/[^a-z0-9]/g, "");
  return (
    normalisasiIdentitas(identitas[1]) === normalisasiIdentitas(kodeMataKuliah) &&
    normalisasiIdentitas(identitas[2]) === normalisasiIdentitas(namaMataKuliah)
  );
}

export function bacaKodeMataKuliahDariNamaFile(namaFile: string): string | null {
  const match = namaFile.match(/^([^_]+)_.+_nilai\.xlsx$/i);
  return match?.[1] ?? null;
}

export function normalisasiKodeMataKuliah(kode: string): string {
  return kode
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]/g, "");
}

export function namaSheetNilai(index: number, kelas: string, tugas: string): string {
  const slug = `${kelas} - ${tugas}`.replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim();
  return `${index + 1} ${slug}`.slice(0, 31);
}

export function normalisasiNamaSheetNilai(nama: string): string {
  return nama
    .replace(/^\s*\d+\s+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]/g, "");
}

export function normalisasiHeaderNilai(teks: string): string {
  return teks.normalize("NFKC").trim().toLocaleLowerCase("id").replace(/\s+/g, " ");
}

export function petakanKolomNilai(
  header: string[],
  wajibKelas = true,
): Map<"kelas" | "nim" | "nilai", number> | null {
  const kolom = new Map<"kelas" | "nim" | "nilai", number>();
  header.forEach((judul, index) => {
    const kunci = normalisasiHeaderNilai(judul);
    if (kunci === "kelas" || kunci === "nama kelas") kolom.set("kelas", index + 1);
    if (kunci === "nim" || kunci === "nim mahasiswa") kolom.set("nim", index + 1);
    if (kunci === "nilai" || kunci === "skor" || kunci === "nilai tugas") kolom.set("nilai", index + 1);
  });
  return kolom.has("nim") && kolom.has("nilai") && (!wajibKelas || kolom.has("kelas")) ? kolom : null;
}

export function bacaNilaiImpor(teks: string): { nilai: number | null; pesan: string | null } {
  const bersih = teks.trim();
  if (!bersih) return { nilai: null, pesan: null };
  const nilai = Number(bersih.replace(",", "."));
  if (
    !Number.isFinite(nilai) ||
    nilai < 0 ||
    nilai > 100 ||
    Math.abs(nilai * 10 - Math.round(nilai * 10)) > 1e-8
  ) {
    return {
      nilai: null,
      pesan: "Nilai harus berupa angka 0–100 dengan maksimal satu angka desimal.",
    };
  }
  return { nilai, pesan: null };
}
