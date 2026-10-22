import { test } from "node:test";
import assert from "node:assert/strict";
import { rataBerbobot, type HasilHitung } from "../src/lib/perhitungan/rumus";
import { hitungSubCPMK } from "../src/lib/perhitungan/hitungSubCPMK";
import { hitungCPMK } from "../src/lib/perhitungan/hitungCPMK";
import { hitungCPL } from "../src/lib/perhitungan/hitungCPL";

const dekat = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("rataBerbobot: daftar kosong menghasilkan 0", () => {
  assert.equal(rataBerbobot([]), 0);
});

test("rataBerbobot: rata-rata dibobot dengan benar", () => {
  // (80*0.25 + 60*0.75) / 1 = 65
  dekat(rataBerbobot([{ nilai: 80, bobot: 0.25 }, { nilai: 60, bobot: 0.75 }]), 65);
});

test("rataBerbobot: bobot tidak harus berjumlah 1 (dinormalisasi)", () => {
  dekat(rataBerbobot([{ nilai: 90, bobot: 30 }, { nilai: 70, bobot: 70 }]), 76);
});

test("rataBerbobot: semua bobot 0 jatuh ke rata-rata biasa", () => {
  dekat(rataBerbobot([{ nilai: 90, bobot: 0 }, { nilai: 70, bobot: 0 }]), 80);
});

test("hitungSubCPMK: tanpa tugas terkait menghasilkan null", () => {
  assert.equal(hitungSubCPMK([], new Map()), null);
});

test("hitungSubCPMK: semua tugas bernilai -> lengkap", () => {
  const tugas = [{ id: "a", bobot: 0.4 }, { id: "b", bobot: 0.6 }];
  const hasil = hitungSubCPMK(tugas, new Map([["a", 100], ["b", 50]]))!;
  dekat(hasil.nilai, 70);
  assert.equal(hasil.statusLengkap, true);
});

test("hitungSubCPMK: tugas tanpa nilai diabaikan, bobot dinormalisasi ulang, status tidak lengkap", () => {
  const tugas = [{ id: "a", bobot: 0.4 }, { id: "b", bobot: 0.6 }];
  const hasil = hitungSubCPMK(tugas, new Map([["b", 80]]))!;
  dekat(hasil.nilai, 80); // hanya tugas b yang dihitung
  assert.equal(hasil.statusLengkap, false);
});

test("hitungSubCPMK: nilai 0 yang diisi dosen dihitung, bukan dianggap kosong", () => {
  const tugas = [{ id: "a", bobot: 0.5 }, { id: "b", bobot: 0.5 }];
  const hasil = hitungSubCPMK(tugas, new Map([["a", 0], ["b", 100]]))!;
  dekat(hasil.nilai, 50);
  assert.equal(hasil.statusLengkap, true);
});

test("hitungSubCPMK: belum ada satu pun nilai -> 0 dan tidak lengkap (perilaku saat ini)", () => {
  const hasil = hitungSubCPMK([{ id: "a", bobot: 1 }], new Map())!;
  assert.deepEqual(hasil, { nilai: 0, statusLengkap: false });
});

test("hitungCPMK: tanpa Sub-CPMK menghasilkan null", () => {
  assert.equal(hitungCPMK([], new Map()), null);
});

test("hitungCPMK: rata-rata berbobot dari hasil Sub-CPMK", () => {
  const hasilSub = new Map<string, HasilHitung>([
    ["s1", { nilai: 90, statusLengkap: true }],
    ["s2", { nilai: 60, statusLengkap: true }],
  ]);
  const hasil = hitungCPMK([{ id: "s1", bobot: 50 }, { id: "s2", bobot: 50 }], hasilSub)!;
  dekat(hasil.nilai, 75);
  assert.equal(hasil.statusLengkap, true);
});

test("hitungCPMK: Sub-CPMK tanpa hasil diabaikan dan CPMK ditandai tidak lengkap", () => {
  const hasilSub = new Map<string, HasilHitung>([["s1", { nilai: 80, statusLengkap: true }]]);
  const hasil = hitungCPMK([{ id: "s1", bobot: 50 }, { id: "s2", bobot: 50 }], hasilSub)!;
  dekat(hasil.nilai, 80);
  assert.equal(hasil.statusLengkap, false);
});

test("hitungCPMK: Sub-CPMK yang belum lengkap membuat CPMK belum lengkap", () => {
  const hasilSub = new Map<string, HasilHitung>([["s1", { nilai: 80, statusLengkap: false }]]);
  assert.equal(hitungCPMK([{ id: "s1", bobot: 100 }], hasilSub)!.statusLengkap, false);
});

test("hitungCPMK: tidak ada satu pun hasil Sub-CPMK menghasilkan null", () => {
  assert.equal(hitungCPMK([{ id: "s1", bobot: 100 }], new Map()), null);
});

test("hitungCPL: tanpa CPMK menghasilkan null", () => {
  assert.equal(hitungCPL([]), null);
});

test("hitungCPL: dibobot per CPMK, lengkap hanya jika semua CPMK lengkap", () => {
  const lengkap = hitungCPL([
    { nilai: 80, bobot: 30, statusLengkap: true },
    { nilai: 60, bobot: 70, statusLengkap: true },
  ])!;
  dekat(lengkap.nilai, 66);
  assert.equal(lengkap.statusLengkap, true);

  const sebagian = hitungCPL([
    { nilai: 80, bobot: 30, statusLengkap: true },
    { nilai: 60, bobot: 70, statusLengkap: false },
  ])!;
  assert.equal(sebagian.statusLengkap, false);
});
