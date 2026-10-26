import { test } from "node:test";
import assert from "node:assert/strict";
import { KELAS_BELUM, pilihKelas } from "../src/lib/kelas-terpilih";

const daftar = [{ id: "kelasA" }, { id: "kelasB" }];

test("pilihKelas: tanpa parameter default ke kelas pertama", () => {
  assert.equal(pilihKelas(daftar, undefined)?.id, "kelasA");
});

test("pilihKelas: 'belum' menampilkan mahasiswa tanpa kelas, bukan kelas pertama", () => {
  assert.equal(pilihKelas(daftar, KELAS_BELUM), null);
});

test("pilihKelas: id kelas yang valid dipilih apa adanya", () => {
  assert.equal(pilihKelas(daftar, "kelasB")?.id, "kelasB");
});

test("pilihKelas: id tidak dikenal jatuh ke kelas pertama", () => {
  assert.equal(pilihKelas(daftar, "sudah-dihapus")?.id, "kelasA");
});

test("pilihKelas: MK tanpa kelas selalu menghasilkan null", () => {
  assert.equal(pilihKelas([], undefined), null);
  assert.equal(pilihKelas([], KELAS_BELUM), null);
});
