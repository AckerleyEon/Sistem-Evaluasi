export type IdentitasMataKuliah = { id: string; kode: string; nama: string };
export type KolomAsesmen = "kelas" | "nama" | "pertemuan" | "bobot" | "sub";

export function normalisasiKunciAsesmen(teks: string): string {
  return teks.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id").replace(/[^a-z0-9]/g, "");
}

export function cariMataKuliahDariNamaFile<T extends IdentitasMataKuliah>(
  namaFile: string,
  mataKuliah: T[],
): T | undefined {
  if (!/^.+_asesmen\.xlsx$/i.test(namaFile)) return undefined;
  const kunciFile = normalisasiKunciAsesmen(namaFile);
  return mataKuliah.find(
    (item) => normalisasiKunciAsesmen(`${item.kode}_${item.nama}_asesmen.xlsx`) === kunciFile,
  );
}

export function petakanKolomAsesmen(header: string[]): Map<KolomAsesmen, number> | null {
  const kolom = new Map<KolomAsesmen, number>();
  header.forEach((judul, index) => {
    const kunci = normalisasiKunciAsesmen(judul.trim());
    if (kunci === "kelas") kolom.set("kelas", index + 1);
    if (kunci === "namatugas") kolom.set("nama", index + 1);
    if (kunci === "pertemuan" || kunci === "pertemuanke") kolom.set("pertemuan", index + 1);
    if (kunci === "bobot" || kunci === "bobotpersen") kolom.set("bobot", index + 1);
    if (kunci.startsWith("kodesubcpmk")) kolom.set("sub", index + 1);
  });
  return kolom.size === 5 ? kolom : null;
}
