import { test } from "node:test";
import assert from "node:assert/strict";
import { angkaKode, bagiProporsional, bobotKePersen } from "../src/lib/asesmen-util";
import { hitungAngkatanDariNim } from "../src/lib/nim";
import { MIN_SANDI, MAKS_SANDI, validasiSandi } from "../src/lib/sandi";

test("angkaKode mengambil angka di akhir kode", () => {
  assert.equal(angkaKode("CPMK-3"), "3");
  assert.equal(angkaKode("Sub-CPMK-12"), "12");
  assert.equal(angkaKode("tanpa-angka"), "tanpa-angka");
});

test("bobotKePersen mengubah pecahan ke persen dengan satu desimal", () => {
  assert.equal(bobotKePersen(0.4), 40);
  assert.equal(bobotKePersen(0.333), 33.3);
});

test("bagiProporsional: total selalu persis sama dengan target", () => {
  for (const lama of [[50, 50], [33, 33, 34], [10, 20, 70], [1, 1, 1], [99, 1], [7]]) {
    for (const target of [100, 90, 60, 1]) {
      const hasil = bagiProporsional(lama, target);
      assert.equal(hasil.length, lama.length);
      assert.equal(hasil.reduce((a, b) => a + b, 0), target, `lama=${lama} target=${target}`);
      assert.ok(hasil.every(Number.isInteger));
    }
  }
});

test("bagiProporsional: menjaga perbandingan dan menangani daftar kosong / total nol", () => {
  assert.deepEqual(bagiProporsional([], 100), []);
  assert.deepEqual(bagiProporsional([20, 80], 50), [10, 40]);
  assert.equal(bagiProporsional([0, 0, 0, 0], 100).reduce((a, b) => a + b, 0), 100);
});

test("hitungAngkatanDariNim membaca dua digit pertama", () => {
  assert.equal(hitungAngkatanDariNim("220411100001"), 2022);
  assert.equal(hitungAngkatanDariNim("250411100123"), 2025);
});

test("hitungAngkatanDariNim menolak NIM yang bukan 12 digit angka", () => {
  for (const nim of ["", "12345", "22041110000a", "2204111000012"]) {
    assert.throws(() => hitungAngkatanDariNim(nim), /12 digit/);
  }
});

test("validasiSandi: panjang minimum, maksimum, dan konfirmasi", () => {
  assert.match(validasiSandi("a".repeat(MIN_SANDI - 1))!, /minimal/);
  assert.equal(validasiSandi("a".repeat(MIN_SANDI)), null);
  assert.match(validasiSandi("a".repeat(MAKS_SANDI + 1))!, /maksimal/);
  assert.equal(validasiSandi("sandi-aman-1", "sandi-aman-1"), null);
  assert.match(validasiSandi("sandi-aman-1", "beda")!, /tidak cocok/);
  assert.match(validasiSandi("")!, /minimal/);
});
