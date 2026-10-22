import { test } from "node:test";
import assert from "node:assert/strict";
import { bacaMatriks, cariDosen } from "../src/lib/impor-mk";

test("bacaMatriks membaca format template tanpa kolom Semester", () => {
  assert.deepEqual(
    bacaMatriks([
      ["Dosen", "Kode MK", "Nama Mata Kuliah", "SKS", "Kelas", "Jumlah Kelas"],
      ["Dosen Contoh", "TE201", "Mata Kuliah Contoh", "3", "A/B", "2"],
    ]),
    [{
      baris: 2,
      dosen: "Dosen Contoh",
      kode: "TE201",
      nama: "Mata Kuliah Contoh",
      sks: "3",
      kelas: "A/B",
      jumlah: "2",
      cpl: "",
      cplAdaKolom: false,
      cplNilaiValid: true,
    }],
  );
});

test("bacaMatriks mengabaikan kolom Semester pada workbook lama", () => {
  const [baris] = bacaMatriks([
    ["Dosen", "Semester", "Kode MK", "Nama Mata Kuliah", "SKS", "Kelas", "Jumlah Kelas"],
    ["Dosen Contoh", "Ganjil", "TE201", "Mata Kuliah Contoh", "3", "A", "1"],
  ]);
  assert.equal(baris.kode, "TE201");
  assert.equal(baris.nama, "Mata Kuliah Contoh");
  assert.equal(baris.kelas, "A");
  assert.equal("semester" in baris, false);
  assert.equal(baris.cplAdaKolom, false);
});

test("bacaMatriks membaca pemetaan CPL dari kolom indikator", () => {
  const [baris] = bacaMatriks([
    ["Dosen", "Kode MK", "Nama MK", "SKS", "Kelas", "Jumlah Kelas", "CPL-1", "CPL-2", "CPL-3"],
    ["Dosen Contoh", "TE201", "Mata Kuliah Contoh", "3", "A", "1", "1", "0", "X"],
  ]);
  assert.deepEqual(baris.cpl, "CPL-1,CPL-3");
  assert.equal(baris.cplAdaKolom, true);
  assert.equal(baris.cplNilaiValid, true);
});

test("bacaMatriks menandai indikator pemetaan CPL yang tidak dikenal", () => {
  const [baris] = bacaMatriks([
    ["Dosen", "Kode MK", "Nama MK", "SKS", "Kelas", "Jumlah Kelas", "CPL-1"],
    ["Dosen Contoh", "TE201", "Mata Kuliah Contoh", "3", "A", "1", "ya mungkin"],
  ]);
  assert.equal(baris.cplNilaiValid, false);
});

test("cariDosen mencocokkan alias dengan aman dan menolak hasil ambigu", () => {
  const dosen = [
    { id: "1", nama: "Aeri Example", gelar: null, alias: "Aeri" },
    { id: "2", nama: "Rika Example", gelar: null, alias: null },
  ];
  assert.equal(cariDosen("Aeri", dosen)?.id, "1");
  assert.equal(cariDosen("Rika Example", dosen)?.id, "2");
  assert.equal(cariDosen("Unknown", dosen), null);
  assert.equal(cariDosen("Aeri", [...dosen, { ...dosen[1], alias: "Aeri" }]), null);
});
