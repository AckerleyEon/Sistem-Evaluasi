import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  KOLOM_ASESMEN,
  cariMataKuliahDariNamaFile,
  normalisasiNamespaceWorkbookExcel,
  normalisasiKunciAsesmen,
  petakanKolomAsesmen,
  saringBarisAsesmenBaru,
} from "../src/lib/asesmen-impor-util";

const mataKuliah = [
  { id: "mk-1", kode: "ELKA101", nama: "Elektronika Analog" },
  { id: "mk-2", kode: "ELKA202", nama: "Sistem Digital" },
];

test("cariMataKuliahDariNamaFile menerima slug dan kapitalisasi berbeda", () => {
  assert.equal(
    cariMataKuliahDariNamaFile("ELKA101_Elektronika-Analog_asesmen.xlsx", mataKuliah)?.id,
    "mk-1",
  );
  assert.equal(
    cariMataKuliahDariNamaFile("elka202_sistem_digital_ASESMEN.XLSX", mataKuliah)?.id,
    "mk-2",
  );
});

test("cariMataKuliahDariNamaFile menolak nama file yang tidak cocok", () => {
  assert.equal(cariMataKuliahDariNamaFile("ELKA101_asesmen.xlsx", mataKuliah), undefined);
  assert.equal(cariMataKuliahDariNamaFile("ELKA999_Mata-Kuliah_asesmen.xlsx", mataKuliah), undefined);
  assert.equal(cariMataKuliahDariNamaFile("ELKA101_Elektronika-Analog.xlsx", mataKuliah), undefined);
});

test("petakanKolomAsesmen mendukung alternatif judul kolom dan urutan berbeda", () => {
  const kolom = petakanKolomAsesmen([
    "Kode Sub-CPMK (pisahkan koma)",
    "Bobot (%)",
    "Kelas",
    "Pertemuan Ke",
    "Nama Tugas",
  ]);
  assert.ok(kolom);
  assert.deepEqual(Object.fromEntries(kolom), {
    sub: 1,
    bobot: 2,
    kelas: 3,
    pertemuan: 4,
    nama: 5,
  });
});

test("petakanKolomAsesmen menolak template tanpa kolom wajib", () => {
  assert.equal(petakanKolomAsesmen(["Kelas", "Nama Tugas", "Pertemuan", "Bobot"]), null);
});

test("petakanKolomAsesmen menerima judul kolom yang ditampilkan pada modal impor", () => {
  const kolom = petakanKolomAsesmen([...KOLOM_ASESMEN]);
  assert.ok(kolom);
  assert.deepEqual(Object.fromEntries(kolom), {
    kelas: 1,
    nama: 2,
    pertemuan: 3,
    bobot: 4,
    sub: 5,
  });
});

test("normalisasiKunciAsesmen menyamakan kapitalisasi dan pemisah", () => {
  assert.equal(normalisasiKunciAsesmen("  Sistem-Digital "), "sistemdigital");
  assert.equal(normalisasiKunciAsesmen("Elektronika Analog"), "elektronikaanalog");
});

test("saringBarisAsesmenBaru melewati tugas lama dan mempertahankan tugas baru", () => {
  const baris = [
    { nama: "Kuis 1", bobot: 20 },
    { nama: "Tugas Proyek", bobot: 30 },
  ];

  assert.deepEqual(saringBarisAsesmenBaru(baris, ["kuis-1"]), {
    barisBaru: [{ nama: "Tugas Proyek", bobot: 30 }],
    jumlahDilewati: 1,
  });
});

test("normalisasiNamespaceWorkbookExcel mendukung workbook dengan prefix namespace", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Asesmen").addRow([...KOLOM_ASESMEN]);
  const zip = await JSZip.loadAsync(Buffer.from(await workbook.xlsx.writeBuffer()));
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir || !path.endsWith(".xml")) continue;
    const xml = await file.async("string");
    if (!xml.includes('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')) continue;
    const xmlDenganPrefix = xml
      .replace(/<(\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g, "<$1x:$2")
      .replace(
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      );
    zip.file(path, xmlDenganPrefix);
  }

  const bufferNormal = await normalisasiNamespaceWorkbookExcel(
    await zip.generateAsync({ type: "nodebuffer" }),
  );
  const workbookTerbaca = new ExcelJS.Workbook();
  await workbookTerbaca.xlsx.load(bufferNormal as unknown as ExcelJS.Buffer);
  assert.deepEqual(workbookTerbaca.worksheets.map((sheet) => sheet.name), ["Asesmen"]);
});
