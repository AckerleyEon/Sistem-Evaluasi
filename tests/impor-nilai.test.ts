import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BATAS_IMPOR_NILAI,
  bacaKodeMataKuliahDariNamaFile,
  buatNamaFileNilai,
  bacaNilaiImpor,
  namaSheetNilai,
  normalisasiNamaSheetNilai,
  namaFileNilaiSesuai,
  normalisasiKodeMataKuliah,
  petakanKolomNilai,
} from "../src/lib/nilai-impor-util";

test("petakanKolomNilai mendukung urutan kolom dan judul alternatif", () => {
  const kolom = petakanKolomNilai(["Nilai Tugas", "NIM Mahasiswa", "Nama Kelas"]);
  assert.ok(kolom);
  assert.deepEqual(Object.fromEntries(kolom), {
    nilai: 1,
    nim: 2,
    kelas: 3,
  });
});

test("petakanKolomNilai menolak sheet tanpa kolom kelas", () => {
  assert.equal(petakanKolomNilai(["NIM", "Nama Mahasiswa", "Nilai"]), null);
});

test("petakanKolomNilai tetap mendukung template lama per tugas", () => {
  const kolom = petakanKolomNilai(["NIM", "Nama Mahasiswa", "Nilai"], false);
  assert.ok(kolom);
  assert.deepEqual(Object.fromEntries(kolom), { nim: 1, nilai: 3 });
});

test("bacaNilaiImpor menerima nilai 0-100 dengan satu desimal", () => {
  assert.deepEqual(bacaNilaiImpor("87,5"), { nilai: 87.5, pesan: null });
  assert.deepEqual(bacaNilaiImpor("0"), { nilai: 0, pesan: null });
  assert.deepEqual(bacaNilaiImpor(""), { nilai: null, pesan: null });
});

test("bacaNilaiImpor menolak nilai di luar batas dan lebih dari satu desimal", () => {
  assert.match(bacaNilaiImpor("100,1").pesan ?? "", /0–100/);
  assert.match(bacaNilaiImpor("75,25").pesan ?? "", /satu angka desimal/);
  assert.equal(BATAS_IMPOR_NILAI.jumlahFile, 20);
});

test("nama file nilai mengikuti format KODEMK_NAMA-MK_nilai.xlsx", () => {
  const namaFile = buatNamaFileNilai("TEO-308", "Prak Sistem Digital");
  assert.equal(namaFile, "TEO-308_Prak-Sistem-Digital_nilai.xlsx");
  assert.equal(namaFileNilaiSesuai("teo-308_prak-sistem-digital_NILAI.xlsx", "TEO-308", "Prak Sistem Digital"), true);
  assert.equal(namaFileNilaiSesuai("TEO-102_Matematika-I_nilai.xlsx", "TEO 102", "Matematika I"), true);
  assert.equal(namaFileNilaiSesuai("import-nilai-TEO-308-Prak-Sistem-Digital.xlsx", "TEO-308", "Prak Sistem Digital"), false);
  assert.equal(bacaKodeMataKuliahDariNamaFile("TEO-308_Prak-Sistem-Digital_nilai.xlsx"), "TEO-308");
  assert.equal(bacaKodeMataKuliahDariNamaFile("import-nilai-TEO-308.xlsx"), null);
  assert.equal(normalisasiKodeMataKuliah("TEO 102"), normalisasiKodeMataKuliah("TEO-102"));
});

test("nama sheet nilai dibuat konsisten untuk pemetaan metadata yang kosong", () => {
  assert.equal(namaSheetNilai(0, "A", "Analisis Studi Kasus"), "1 A - Analisis Studi Kasus");
  assert.equal(namaSheetNilai(1, "B", "Praktik Simulasi"), "2 B - Praktik Simulasi");
  assert.equal(
    normalisasiNamaSheetNilai("1 B - Tugas Individu"),
    normalisasiNamaSheetNilai("11 B - Tugas Individu"),
  );
});
