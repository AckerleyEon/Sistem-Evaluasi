import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BATAS_IMPOR_CPMK,
  bacaBobotPersen,
  cariMataKuliahDariNamaFileCPMK,
  normalisasiKodeMK,
  petakanKolomPemetaanCPMK,
  saringBarisBergalat,
  validasiBarisCPMK,
  type BarisCPMKExcel,
} from "../src/lib/impor-cpmk";

function baris(overrides: Partial<BarisCPMKExcel> = {}): BarisCPMKExcel {
  return {
    baris: 2,
    kodeMK: "TE201",
    namaMK: "Mata Kuliah Contoh",
    kodeCPMK: "CPMK-1",
    bobotCPMK: "0.5",
    deskripsiCPMK: "Mampu menjelaskan konsep pembelajaran dengan tepat.",
    kodeSubCPMK: "Sub-CPMK-1",
    bobotSubCPMK: "0.5",
    deskripsiSubCPMK: "Mampu mengidentifikasi konsep dasar pembelajaran.",
    ...overrides,
  };
}

test("bacaBobotPersen menerima bobot pecahan dan persen bulat", () => {
  assert.equal(bacaBobotPersen("0,25"), 25);
  assert.equal(bacaBobotPersen("25"), 25);
  assert.equal(bacaBobotPersen("25%"), 25);
  assert.equal(bacaBobotPersen("0.125"), null);
  assert.equal(bacaBobotPersen("101"), null);
});

test("normalisasiKodeMK mengabaikan perbedaan spasi", () => {
  assert.equal(normalisasiKodeMK(" teo  201 "), "TEO201");
});

test("batas impor CPMK mendukung 300 file, 20 MB per file, dan 1 GB total", () => {
  assert.equal(BATAS_IMPOR_CPMK.jumlahFile, 300);
  assert.equal(BATAS_IMPOR_CPMK.ukuranPerFile, 20 * 1024 * 1024);
  assert.equal(BATAS_IMPOR_CPMK.ukuranTotal, 1024 * 1024 * 1024);
});

test("cariMataKuliahDariNamaFileCPMK mengenali nama file pemetaan terpisah", () => {
  const mataKuliah = [{ id: "mk-1", kode: "TEM 711", nama: "Akuisisi Data dan Pengolahan Sinyal" }];
  assert.equal(
    cariMataKuliahDariNamaFileCPMK("TEM 711_Akuisisi Data dan Pengolahan Sinyal_Pemetaan.xlsx", mataKuliah)?.id,
    "mk-1",
  );
  assert.equal(cariMataKuliahDariNamaFileCPMK("TEM 712_Nama Lain_Pemetaan.xlsx", mataKuliah), undefined);
});

test("petakanKolomPemetaanCPMK mengenali header sheet Data Import", () => {
  const kolom = petakanKolomPemetaanCPMK([
    "Kode CPMK",
    "Bobot CPMK",
    "Deskripsi CPMK",
    "Kode Sub CPMK",
    "Bobot Sub CPMK",
    "Deskripsi Sub-CPMK",
  ]);
  assert.ok(kolom);
  assert.deepEqual(Object.fromEntries(kolom), {
    kodeCPMK: 1,
    bobotCPMK: 2,
    deskripsiCPMK: 3,
    kodeSubCPMK: 4,
    bobotSubCPMK: 5,
    deskripsiSubCPMK: 6,
  });
});

test("validasiBarisCPMK mengelompokkan hierarki dan mempertahankan bobot tautan", () => {
  const hasil = validasiBarisCPMK([
    baris({ bobotSubCPMK: "0.5" }),
    baris({
      baris: 3,
      kodeCPMK: "CPMK-2",
      bobotCPMK: "0.5",
      kodeSubCPMK: "Sub-CPMK-1",
      bobotSubCPMK: "0.25",
    }),
    baris({
      baris: 4,
      kodeCPMK: "CPMK-1",
      kodeSubCPMK: "Sub-CPMK-2",
      bobotSubCPMK: "0.5",
    }),
  ]);

  assert.deepEqual(hasil.galat, []);
  assert.equal(hasil.mataKuliah.length, 1);
  assert.equal(hasil.mataKuliah[0].cpmk.length, 2);
  assert.equal(hasil.jumlahPemetaan, 3);
  assert.deepEqual(hasil.mataKuliah[0].cpmk[1].sub.map((sub) => sub.bobot), [25]);
});

test("validasiBarisCPMK menolak deskripsi Sub-CPMK yang konflik dalam satu mata kuliah", () => {
  const hasil = validasiBarisCPMK([
    baris(),
    baris({
      baris: 3,
      kodeCPMK: "CPMK-2",
      bobotCPMK: "0.5",
      deskripsiSubCPMK: "Deskripsi berbeda untuk Sub-CPMK yang sama.",
    }),
  ]);
  assert.ok(hasil.galat.some((item) => item.pesan.includes("memiliki deskripsi berbeda")));
});

test("validasiBarisCPMK menolak bobot total yang melebihi batas 100 persen", () => {
  const hasil = validasiBarisCPMK([
    baris({ bobotCPMK: "60", bobotSubCPMK: "60" }),
    baris({ baris: 3, kodeSubCPMK: "Sub-CPMK-2", bobotSubCPMK: "60" }),
    baris({ baris: 4, kodeCPMK: "CPMK-2", bobotCPMK: "50", kodeSubCPMK: "Sub-CPMK-3", bobotSubCPMK: "50" }),
  ]);
  assert.ok(hasil.galat.some((item) => item.pesan.includes("Total bobot CPMK")));
  assert.ok(hasil.galat.some((item) => item.pesan.includes("Total bobot Sub-CPMK")));
});

test("saringBarisBergalat mempertahankan dan mengelompokkan hanya baris valid", () => {
  const semua = validasiBarisCPMK([
    baris(),
    baris({
      baris: 3,
      kodeCPMK: "CPMK-2",
      bobotCPMK: "0.5",
      deskripsiSubCPMK: "Deskripsi berbeda untuk Sub-CPMK yang sama.",
    }),
    baris({
      baris: 4,
      kodeCPMK: "format-salah",
      kodeSubCPMK: "Sub-CPMK-2",
    }),
  ]);
  const valid = saringBarisBergalat(semua, semua.galat);

  assert.equal(semua.galat.length, 2);
  assert.equal(valid.jumlahBaris, 1);
  assert.equal(valid.jumlahPemetaan, 1);
  assert.equal(valid.galat.length, 0);
  assert.deepEqual(valid.mataKuliah[0].cpmk.map((cpmk) => cpmk.kode), ["CPMK-1"]);
});

test("saringBarisBergalat membedakan nomor baris yang sama dari file berbeda", () => {
  const semua = validasiBarisCPMK([
    baris({ sumber: "mk-a_Pemetaan.xlsx" }),
    baris({ sumber: "mk-b_Pemetaan.xlsx", kodeCPMK: "format-salah" }),
  ]);
  const valid = saringBarisBergalat(semua, semua.galat);

  assert.equal(valid.jumlahBaris, 1);
  assert.equal(valid.barisSumber[0].sumber, "mk-a_Pemetaan.xlsx");
});

test("saringBarisBergalat melewati seluruh kelompok yang total bobotnya melampaui batas", () => {
  const semua = validasiBarisCPMK([
    baris({ bobotCPMK: "60", bobotSubCPMK: "60" }),
    baris({ baris: 3, kodeSubCPMK: "Sub-CPMK-2", bobotSubCPMK: "60" }),
    baris({ baris: 4, kodeCPMK: "CPMK-2", bobotCPMK: "50", kodeSubCPMK: "Sub-CPMK-3", bobotSubCPMK: "50" }),
  ]);
  const valid = saringBarisBergalat(semua, semua.galat);

  assert.ok(semua.galat.length > 0);
  assert.equal(valid.jumlahBaris, 0);
  assert.equal(valid.jumlahPemetaan, 0);
});
