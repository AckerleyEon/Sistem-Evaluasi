import { test } from "node:test";
import assert from "node:assert/strict";
import { distribusikanSeimbang } from "../src/lib/distribusi/roundRobin";

const tugas = (...id: string[]) => id.map((i) => ({ id: i }));
const petaTujuan = (hasil: { item: string; tujuan: { id: string } }[]) =>
  hasil.map((h) => `${h.item}->${h.tujuan.id}`);

test("tanpa tugas tujuan tidak ada yang didistribusikan", () => {
  assert.deepEqual(distribusikanSeimbang(["s1"], [], new Map()), []);
});

test("tanpa Sub-CPMK tersisa hasilnya kosong", () => {
  assert.deepEqual(distribusikanSeimbang([], tugas("t1", "t2"), new Map()), []);
});

test("jumlah Sub-CPMK sama dengan jumlah tugas: satu-satu", () => {
  const hasil = distribusikanSeimbang(["s1", "s2", "s3"], tugas("t1", "t2", "t3"), new Map());
  assert.deepEqual(petaTujuan(hasil), ["s1->t1", "s2->t2", "s3->t3"]);
});

test("Sub-CPMK lebih banyak dari tugas: berputar lagi dari tugas pertama", () => {
  const hasil = distribusikanSeimbang(["s1", "s2", "s3", "s4", "s5"], tugas("t1", "t2"), new Map());
  assert.deepEqual(petaTujuan(hasil), ["s1->t1", "s2->t2", "s3->t1", "s4->t2", "s5->t1"]);
});

test("tugas yang sudah punya kaitan manual diberi giliran belakangan", () => {
  // t1 sudah membawa 2 kaitan manual, t2 satu, t3 nol.
  const awal = new Map([["t1", 2], ["t2", 1]]);
  const hasil = distribusikanSeimbang(["s1", "s2", "s3"], tugas("t1", "t2", "t3"), awal);
  assert.deepEqual(petaTujuan(hasil), ["s1->t3", "s2->t2", "s3->t3"]);
});

test("beban akhir antar tugas selisihnya paling banyak satu", () => {
  const hasil = distribusikanSeimbang(Array.from({ length: 11 }, (_, i) => `s${i}`), tugas("a", "b", "c", "d"), new Map());
  const hitung = new Map<string, number>();
  for (const h of hasil) hitung.set(h.tujuan.id, (hitung.get(h.tujuan.id) ?? 0) + 1);
  const nilai = [...hitung.values()];
  assert.ok(Math.max(...nilai) - Math.min(...nilai) <= 1);
  assert.equal(nilai.reduce((a, b) => a + b, 0), 11);
});

test("peta jumlah awal dari pemanggil tidak dimodifikasi", () => {
  const awal = new Map([["t1", 1]]);
  distribusikanSeimbang(["s1", "s2"], tugas("t1", "t2"), awal);
  assert.deepEqual([...awal], [["t1", 1]]);
});
