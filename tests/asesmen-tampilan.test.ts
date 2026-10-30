import { test } from "node:test";
import assert from "node:assert/strict";
import { daftarSubUnik, lencanaBobot, posisiCallout, statusDistribusi } from "../src/lib/asesmen-tampilan";

const koordinator = { adaTugas: true, bolehKelola: true, arsip: false };

test("statusDistribusi: tombol aktif hanya jika masih ada Sub-CPMK yang belum terhubung", () => {
  assert.deepEqual(statusDistribusi(7, 14, koordinator), { lengkap: false, tombolAktif: true, alasanNonaktif: null });
  const penuh = statusDistribusi(14, 14, koordinator);
  assert.equal(penuh.lengkap, true);
  assert.equal(penuh.tombolAktif, false);
  assert.equal(penuh.alasanNonaktif, "Semua Sub-CPMK sudah terdistribusi");
});

test("statusDistribusi: nonaktif bila arsip, bukan koordinator, tanpa tugas, atau tanpa Sub-CPMK", () => {
  assert.equal(statusDistribusi(0, 5, { ...koordinator, arsip: true }).tombolAktif, false);
  assert.equal(statusDistribusi(0, 5, { ...koordinator, bolehKelola: false }).tombolAktif, false);
  assert.equal(statusDistribusi(0, 5, { ...koordinator, adaTugas: false }).tombolAktif, false);
  const kosong = statusDistribusi(0, 0, koordinator);
  assert.equal(kosong.tombolAktif, false);
  assert.equal(kosong.lengkap, false);
});

test("lencanaBobot: biru bila 100%, oranye bila kurang, merah bila lebih", () => {
  assert.deepEqual(lencanaBobot(100, 8), { teks: "100% Terpakai", nada: "biru" });
  assert.deepEqual(lencanaBobot(85, 3), { teks: "Kurang 15%", nada: "oranye" });
  assert.deepEqual(lencanaBobot(110, 3), { teks: "Lebih 10%", nada: "merah" });
  assert.deepEqual(lencanaBobot(0, 0), { teks: "Belum ada tugas", nada: "abu" });
});

test("posisiCallout: titik tengah segmen dan sisi bergantian atas/bawah", () => {
  const posisi = posisiCallout([16, 20, 8, 16, 8, 4, 8, 20]);
  assert.deepEqual(posisi.map((p) => p.atas), [false, true, false, true, false, true, false, true]);
  assert.equal(posisi[0].kiri, 8);
  assert.equal(posisi[1].kiri, 26);
  assert.equal(posisi[7].kiri, 90);
});

test("posisiCallout: total di bawah 100 tetap diskalakan terhadap lebar 100%", () => {
  const [satu] = posisiCallout([50]);
  assert.equal(satu.kiri, 25);
});

test("posisiCallout: sembilan tugas tetap tersebar selang-seling", () => {
  const posisi = posisiCallout([19, 20, 11, 6, 10, 4, 8, 11, 11]);
  assert.deepEqual(posisi.map((p) => p.atas), [false, true, false, true, false, true, false, true, false]);
  assert.equal(posisi[8].kiri, 94.5);
});

test("daftarSubUnik membuang duplikat antar-CPMK dan mengurutkan menurut nomor", () => {
  const sub = (id: string, angka: string) => ({ id, angka });
  const hasil = daftarSubUnik([
    { sub: [sub("c", "10"), sub("a", "2")] },
    { sub: [sub("a", "2"), sub("b", "3")] },
  ]);
  assert.deepEqual(hasil.map((s) => s.angka), ["2", "3", "10"]);
});
