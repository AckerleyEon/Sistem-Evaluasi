import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cariMataKuliahDariNamaFile,
  normalisasiKunciAsesmen,
  petakanKolomAsesmen,
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

test("normalisasiKunciAsesmen menyamakan kapitalisasi dan pemisah", () => {
  assert.equal(normalisasiKunciAsesmen("  Sistem-Digital "), "sistemdigital");
  assert.equal(normalisasiKunciAsesmen("Elektronika Analog"), "elektronikaanalog");
});
