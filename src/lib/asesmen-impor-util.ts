import JSZip from "jszip";

export type IdentitasMataKuliah = { id: string; kode: string; nama: string };
export type KolomAsesmen = "kelas" | "nama" | "pertemuan" | "bobot" | "sub";

const NAMESPACE_SPREADSHEET = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

export const KOLOM_ASESMEN = [
  "Kelas",
  "Nama Tugas",
  "Pertemuan",
  "Bobot",
  "Kode Sub-CPMK",
] as const;

export const BATAS_IMPOR_ASESMEN = {
  jumlahFile: 20,
  ukuranPerFile: 5 * 1024 * 1024,
  ukuranTotal: 20 * 1024 * 1024,
} as const;

function normalisasiNamespaceSpreadsheet(xml: string): string {
  const namespaceMatches = xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=(["'])(.*?)\2/g);
  const prefixes = Array.from(namespaceMatches)
    .filter((match) => match[3] === NAMESPACE_SPREADSHEET)
    .map((match) => match[1]);
  return prefixes.reduce((hasil, prefix) => {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return hasil
      .replace(new RegExp(`(<\\/?)${escapedPrefix}:([\\w.-]+)`, "g"), "$1$2")
      .replace(new RegExp(`\\sxmlns:${escapedPrefix}=(["'])${NAMESPACE_SPREADSHEET}\\1`), "");
  }, xml);
}

export async function normalisasiNamespaceWorkbookExcel(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  let berubah = false;
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir || !path.endsWith(".xml")) continue;
    const xml = await file.async("string");
    const xmlNormal = normalisasiNamespaceSpreadsheet(xml);
    if (xmlNormal !== xml) {
      zip.file(path, xmlNormal);
      berubah = true;
    }
  }
  if (!berubah) return buffer;
  return zip.generateAsync({ type: "nodebuffer" });
}

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
