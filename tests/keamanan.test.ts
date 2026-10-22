import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { buatKodeOtp, hashRahasia, samaAman } from "../src/lib/keamanan";
import { ambilIp, catatPercobaan, hapusCatatan, menitTersisa, sisaBlokirMs } from "../src/lib/rate-limit";

process.env.AUTH_SECRET = "rahasia-untuk-tes";

test("hashRahasia konsisten, bukan nilai asli, dan berbeda untuk masukan berbeda", () => {
  assert.equal(hashRahasia("123456"), hashRahasia("123456"));
  assert.notEqual(hashRahasia("123456"), hashRahasia("123457"));
  assert.notEqual(hashRahasia("123456"), "123456");
  assert.match(hashRahasia("123456"), /^[a-f0-9]{64}$/);
});

test("hashRahasia bergantung pada AUTH_SECRET", () => {
  const a = hashRahasia("kode");
  process.env.AUTH_SECRET = "rahasia-lain";
  const b = hashRahasia("kode");
  process.env.AUTH_SECRET = "rahasia-untuk-tes";
  assert.notEqual(a, b);
});

test("samaAman membandingkan dengan benar, termasuk panjang berbeda", () => {
  assert.equal(samaAman("abc", "abc"), true);
  assert.equal(samaAman("abc", "abd"), false);
  assert.equal(samaAman("abc", "abcd"), false);
  assert.equal(samaAman("", ""), true);
});

test("buatKodeOtp selalu 6 digit angka", () => {
  for (let i = 0; i < 500; i++) assert.match(buatKodeOtp(), /^\d{6}$/);
});

let n = 0;
let kunci = "";
beforeEach(() => {
  kunci = `tes-${++n}`;
});

test("pembatas: belum terblokir sebelum mencapai batas", () => {
  catatPercobaan(kunci, 1000, 0);
  catatPercobaan(kunci, 1000, 10);
  assert.equal(sisaBlokirMs(kunci, 3, 20), 0);
});

test("pembatas: terblokir saat mencapai batas dan melaporkan sisa waktu", () => {
  for (let i = 0; i < 3; i++) catatPercobaan(kunci, 1000, 100);
  assert.equal(sisaBlokirMs(kunci, 3, 300), 800);
});

test("pembatas: blokir berakhir setelah jendela waktu lewat", () => {
  for (let i = 0; i < 3; i++) catatPercobaan(kunci, 1000, 0);
  assert.ok(sisaBlokirMs(kunci, 3, 999) > 0);
  assert.equal(sisaBlokirMs(kunci, 3, 1000), 0);
});

test("pembatas: percobaan setelah jendela lewat memulai hitungan baru", () => {
  for (let i = 0; i < 3; i++) catatPercobaan(kunci, 1000, 0);
  catatPercobaan(kunci, 1000, 2000);
  assert.equal(sisaBlokirMs(kunci, 3, 2001), 0);
});

test("pembatas: hapusCatatan membuka blokir", () => {
  for (let i = 0; i < 3; i++) catatPercobaan(kunci, 1000, 0);
  hapusCatatan(kunci);
  assert.equal(sisaBlokirMs(kunci, 3, 1), 0);
});

test("pembatas: kunci berbeda tidak saling memengaruhi", () => {
  for (let i = 0; i < 3; i++) catatPercobaan(kunci, 1000, 0);
  assert.equal(sisaBlokirMs(`${kunci}-lain`, 3, 1), 0);
});

test("menitTersisa membulatkan ke atas dengan minimum 1 menit", () => {
  assert.equal(menitTersisa(1), 1);
  assert.equal(menitTersisa(60_000), 1);
  assert.equal(menitTersisa(60_001), 2);
});

test("ambilIp memakai entri pertama X-Forwarded-For, lalu X-Real-IP", () => {
  assert.equal(ambilIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(ambilIp(new Headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(ambilIp(new Headers()), "tidak-diketahui");
});
