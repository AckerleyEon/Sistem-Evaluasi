import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bacaKodeDariNamaFile,
  cariFileGanda,
  cariHeaderMahasiswa,
  judulCocokDenganNamaMK,
  kunciKodeMK,
} from "../src/lib/impor-mahasiswa-massal";

test("bacaKodeDariNamaFile membaca kode MK dari nama file contoh", () => {
  assert.deepEqual(bacaKodeDariNamaFile("UTM_101_Bahasa_Indonesia.xlsx"), {
    kunci: "UTM101",
    kodeAsli: "UTM_101",
    judul: "Bahasa Indonesia",
  });
  assert.equal(bacaKodeDariNamaFile("TEM_715_Penginderaan_Visual_Elektronika.xlsx")?.kunci, "TEM715");
  assert.equal(bacaKodeDariNamaFile("TEO_101_Fisika_Mekanika.xlsx")?.judul, "Fisika Mekanika");
});

test("bacaKodeDariNamaFile menerima variasi pemisah, folder, dan salinan Windows", () => {
  assert.equal(bacaKodeDariNamaFile("tem 713 Teknik Antarmuka.xlsx")?.kunci, "TEM713");
  assert.equal(bacaKodeDariNamaFile("TE201.xlsx")?.kunci, "TE201");
  assert.equal(bacaKodeDariNamaFile("data/TEM-713-Web.XLSX")?.kunci, "TEM713");
  assert.equal(bacaKodeDariNamaFile("UTM_101_Bahasa_Indonesia (1).xlsx")?.judul, "Bahasa Indonesia");
});

test("bacaKodeDariNamaFile menolak nama file tanpa kode MK", () => {
  assert.equal(bacaKodeDariNamaFile("Daftar_Mahasiswa.xlsx"), null);
  assert.equal(bacaKodeDariNamaFile("101_UTM.xlsx"), null);
  assert.equal(bacaKodeDariNamaFile("UTM_1_Satu.xlsx"), null);
  assert.equal(bacaKodeDariNamaFile("UTM_101Bahasa.xlsx"), null);
});

test("kunciKodeMK menyamakan kode berspasi dan bergaris bawah", () => {
  assert.equal(kunciKodeMK("TEM 713"), "TEM713");
  assert.equal(kunciKodeMK("tem_713"), "TEM713");
  assert.equal(kunciKodeMK("TE201"), "TE201");
});

test("judulCocokDenganNamaMK toleran pada judul terpotong tetapi menangkap judul yang salah", () => {
  assert.ok(judulCocokDenganNamaMK("Bahasa Indonesia", "Bahasa Indonesia"));
  assert.ok(judulCocokDenganNamaMK("Regulasi dan Kinerja", "Regulasi dan Kinerja Jaringan Telekomunikasi"));
  assert.ok(judulCocokDenganNamaMK("", "Apa Saja"));
  assert.ok(!judulCocokDenganNamaMK("Pancasila", "Kewarganegaraan"));
});

test("cariFileGanda menandai file kedua dan seterusnya untuk MK yang sama", () => {
  const ganda = cariFileGanda(["UTM101", "UTM201", "UTM101", null, "UTM101"]);
  assert.deepEqual([...ganda], [[2, 0], [4, 0]]);
});

test("cariHeaderMahasiswa menemukan judul di baris ke-3 dan kolom Kelas opsional", () => {
  const hasil = cariHeaderMahasiswa([
    ["DAFTAR PESERTA KULIAH"],
    [],
    ["No", "NIM", "Nama Mahasiswa", "Kelas"],
    ["1", "210411100001", "Budi", "A"],
  ]);
  assert.deepEqual(hasil, { indeksBaris: 2, kolom: { nim: 1, nama: 2, kelas: 3 } });
  assert.deepEqual(cariHeaderMahasiswa([["NIM", "Nama"]]), { indeksBaris: 0, kolom: { nim: 0, nama: 1, kelas: null } });
  assert.equal(cariHeaderMahasiswa([["Kode", "Nilai"]]), null);
});
