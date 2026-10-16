/**
 * Seed lengkap: dua mata kuliah dengan CPMK & Sub-CPMK masing-masing (nomor sama, isi berbeda),
 * kaitan CPMK<->Sub-CPMK (CpmkSub), tugas, distribusi Sub-CPMK per tugas, kelas, dan nilai.
 *
 *   MK RL : CPMK 1,2,3  — Sub-CPMK 1,2,3
 *   MK ET : CPMK 1,2,3  — Sub-CPMK 1,3,4
 *
 * Jalankan:  npx prisma db seed     (atau  npx tsx prisma/seed.ts)
 * Aman diulang: semua data operasional dihapus lalu dibuat ulang.
 *
 * Yang perlu disesuaikan dengan proyekmu (cari tanda "SESUAIKAN"):
 *  - path import PrismaClient (output generator = ../generated/prisma)
 *  - library hash password (harus sama dengan yang dipakai di auth.ts)
 *  - format label tahun ajaran
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs"; // SESUAIKAN: pakai "bcrypt" bila itu yang ada di auth.ts
import { PrismaClient } from "../generated/prisma/client"; // SESUAIKAN bila beda

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ───────────────────────────── Definisi data ─────────────────────────────

const LABEL_TA = "2025/2026 Ganjil"; // SESUAIKAN

const CPL = [
  { kode: "CPL-1", deskripsi: "Mampu menerapkan matematika, sains, dan prinsip rekayasa pada analisis rangkaian dan sistem elektro." },
  { kode: "CPL-2", deskripsi: "Mampu merancang dan menganalisis komponen, rangkaian, atau sistem elektro sesuai kebutuhan." },
  { kode: "CPL-3", deskripsi: "Mampu melakukan pengujian, pengukuran, dan menginterpretasikan data eksperimen." },
];

const MAHASISWA = [
  ["2301001", "Ahmad Fauzi"],
  ["2301002", "Bunga Lestari"],
  ["2301003", "Candra Wijaya"],
  ["2301004", "Dewi Anggraini"],
  ["2301005", "Eko Prasetyo"],
  ["2301006", "Fitri Handayani"],
  ["2301007", "Gilang Ramadhan"],
  ["2301008", "Hana Pertiwi"],
  ["2301009", "Irfan Maulana"],
  ["2301010", "Joko Susilo"],
] as const;

/** Dosen Prodi (username & NIP sama; password awal dosen123). */
const DAFTAR_DOSEN = [
  { nama: "Achmad Fiqhi Ibadillah", gelar: "S.T., M.Sc.", nip: "198807162015041005" },
  { nama: "Achmad Ubaidillah Ms.", gelar: "S.T., M.T", nip: "198106262008011010" },
  { nama: "Achmad Zain Nur", gelar: "S.Kom M.T", nip: "199506102024061002" },
  { nama: "Adi Kurniawan Saputro", gelar: "S.Pd., M.T", nip: "199112312019031017" },
  { nama: "Deni Tri Laksono", gelar: "S.Pd., M.T", nip: "199211292019031014" },
  { nama: "Dian Neipa Purnamasari", gelar: "S.ST, M.Tr.T.", nip: "199506122020122026" },
  { nama: "Diana Rahmawati", gelar: "S.T., M.T", nip: "197910252008012020" },
  { nama: "Haryanto", gelar: "S.T., M.T", nip: "197407052008121004" },
  { nama: "Kunto Aji Wibisono", gelar: "S.T., M.T", nip: "198710142015041001" },
  { nama: "Miftachul Ulum", gelar: "S.T., M.T.", nip: "197608122009121001" },
  { nama: "Monika Faswia Fahmi", gelar: "S.Pd., M.T", nip: "199407282022032012" },
  { nama: "Muhhammad Iyan Putra Pratama", gelar: "S.ST, M.Sc.", nip: "199408192025061004" },
  { nama: "Muttaqin Hardiwansyah", gelar: "S.ST., M.T.", nip: "198804072022031003" },
  { nama: "Puteri Nurul Ma'rifah", gelar: "S.Tr.T., M.Tr.T.", nip: "199706242024062001" },
  { nama: "Riza Alfita", gelar: "ST., MT", nip: "198004192008121003" },
  { nama: "Safriudin Rifandi", gelar: "S.T., M.Tr.T.", nip: "198909232025061001" },
] as const;

/**
 * Tiap MK memiliki CPMK dan Sub-CPMK sendiri. `sub` pada CPMK = kaitan (CpmkSub)
 * dengan bobot (persen) yang totalnya 100 per CPMK. Satu Sub-CPMK boleh dipakai
 * beberapa CPMK, asalkan masih dalam MK yang sama.
 */
interface DefMK {
  kode: string;
  nama: string;
  sks: number;
  semester: number;
  dosenNip: string;
  kelas: string[];
  subCpmk: { no: number; deskripsi: string }[];
  cpmk: {
    no: number;
    bobot: number; // bobot CPMK dalam MK (persen)
    deskripsi: string;
    cpl: string[];
    sub: { no: number; bobot: number }[];
  }[];
  tugas: {
    nama: string;
    pertemuanKe: number;
    bobot: number; // pecahan; total per MK = 1
    sub: number[]; // nomor Sub-CPMK yang dinilai oleh tugas ini
    dinilai: boolean; // apakah nilai mahasiswa sudah diisi
  }[];
}

const MK: DefMK[] = [
  {
    kode: "TEO 211",
    nama: "Rangkaian Listrik (RL)",
    sks: 3,
    semester: 3,
    dosenNip: "197910252008012020", // Diana Rahmawati
    kelas: ["A", "B"],
    subCpmk: [
      { no: 1, deskripsi: "Menerapkan hukum Ohm dan hukum Kirchhoff pada rangkaian resistif." },
      { no: 2, deskripsi: "Menganalisis rangkaian dengan metode node, mesh, dan superposisi." },
      { no: 3, deskripsi: "Menganalisis respons transien rangkaian RL, RC, dan RLC." },
    ],
    cpmk: [
      { no: 1, bobot: 30, deskripsi: "Mampu menganalisis rangkaian resistif dasar.", cpl: ["CPL-1"], sub: [{ no: 1, bobot: 60 }, { no: 2, bobot: 40 }] },
      { no: 2, bobot: 40, deskripsi: "Mampu menganalisis rangkaian dengan teorema rangkaian dan metode sistematis.", cpl: ["CPL-1", "CPL-2"], sub: [{ no: 2, bobot: 50 }, { no: 3, bobot: 50 }] },
      { no: 3, bobot: 30, deskripsi: "Mampu menganalisis respons waktu rangkaian orde satu dan dua.", cpl: ["CPL-2"], sub: [{ no: 3, bobot: 100 }] },
    ],
    tugas: [
      { nama: "Kuis 1", pertemuanKe: 3, bobot: 0.15, sub: [1], dinilai: true },
      { nama: "Tugas 1", pertemuanKe: 5, bobot: 0.15, sub: [1, 2], dinilai: true },
      { nama: "UTS", pertemuanKe: 8, bobot: 0.3, sub: [1, 2], dinilai: true },
      { nama: "Tugas 2", pertemuanKe: 11, bobot: 0.15, sub: [3], dinilai: true },
      { nama: "UAS", pertemuanKe: 16, bobot: 0.25, sub: [2, 3], dinilai: false },
    ],
  },
  {
    kode: "TEO 321",
    nama: "Elektronika Dasar (ET)",
    sks: 3,
    semester: 4,
    dosenNip: "197608122009121001", // Miftachul Ulum
    kelas: ["A"],
    // Sengaja bernomor 1, 3, 4 (tanpa 2): nomornya tidak harus berurutan dan tidak terkait MK lain.
    subCpmk: [
      { no: 1, deskripsi: "Menjelaskan karakteristik dioda dan menerapkannya pada rangkaian penyearah." },
      { no: 3, deskripsi: "Menganalisis rangkaian penguat transistor BJT pada titik kerja DC dan sinyal kecil." },
      { no: 4, deskripsi: "Merancang rangkaian penguat bertingkat dan menguji responsnya." },
    ],
    cpmk: [
      { no: 1, bobot: 35, deskripsi: "Mampu menerapkan dioda pada rangkaian penyearah dan pembatas.", cpl: ["CPL-2"], sub: [{ no: 1, bobot: 50 }, { no: 3, bobot: 50 }] },
      { no: 2, bobot: 35, deskripsi: "Mampu menganalisis dan merancang penguat transistor.", cpl: ["CPL-3"], sub: [{ no: 3, bobot: 40 }, { no: 4, bobot: 60 }] },
      { no: 3, bobot: 30, deskripsi: "Mampu menguji dan menginterpretasikan karakteristik rangkaian elektronika.", cpl: ["CPL-3"], sub: [{ no: 4, bobot: 100 }] },
    ],
    tugas: [
      { nama: "Kuis 1", pertemuanKe: 3, bobot: 0.1, sub: [1], dinilai: true },
      { nama: "Tugas 1", pertemuanKe: 6, bobot: 0.2, sub: [1, 3], dinilai: true },
      { nama: "UTS", pertemuanKe: 8, bobot: 0.3, sub: [3], dinilai: true },
      { nama: "Praktikum", pertemuanKe: 12, bobot: 0.15, sub: [3, 4], dinilai: false },
      { nama: "UAS", pertemuanKe: 16, bobot: 0.25, sub: [4], dinilai: false },
    ],
  },
];

// ───────────────────────────── Bantuan ─────────────────────────────

/** Pseudo-acak deterministik (supaya hasil seed selalu sama). */
function acak(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function cek(kondisi: boolean, pesan: string) {
  if (!kondisi) throw new Error(`Data seed tidak valid: ${pesan}`);
}

function validasi() {
  for (const mk of MK) {
    const noSub = new Set(mk.subCpmk.map((s) => s.no));
    cek(noSub.size === mk.subCpmk.length, `${mk.kode}: nomor Sub-CPMK ganda`);
    cek(mk.cpmk.reduce((a, c) => a + c.bobot, 0) === 100, `${mk.kode}: bobot CPMK != 100`);
    for (const c of mk.cpmk) {
      cek(c.sub.reduce((a, s) => a + s.bobot, 0) === 100, `${mk.kode} CPMK-${c.no}: bobot sub != 100`);
      for (const s of c.sub) cek(noSub.has(s.no), `${mk.kode} CPMK-${c.no}: Sub-CPMK-${s.no} tidak ada`);
    }
    const dipakaiCpmk = new Set(mk.cpmk.flatMap((c) => c.sub.map((s) => s.no)));
    const dipakaiTugas = new Set(mk.tugas.flatMap((t) => t.sub));
    for (const n of noSub) {
      cek(dipakaiCpmk.has(n), `${mk.kode}: Sub-CPMK-${n} tidak terhubung ke CPMK mana pun`);
      cek(dipakaiTugas.has(n), `${mk.kode}: Sub-CPMK-${n} tidak dinilai oleh tugas mana pun`);
    }
    for (const t of mk.tugas) cek(t.sub.every((n) => noSub.has(n)), `${mk.kode} ${t.nama}: Sub-CPMK tidak dikenal`);
    const total = mk.tugas.reduce((a, t) => a + t.bobot, 0);
    cek(Math.abs(total - 1) < 1e-9, `${mk.kode}: total bobot tugas ${total} != 1`);
  }
}

// ───────────────────────────── Seed ─────────────────────────────

async function main() {
  validasi();

  // Hapus data operasional (urutan: anak dulu). User ADMIN dipertahankan lewat upsert di bawah.
  await prisma.hasilCPL.deleteMany();
  await prisma.hasilCPMK.deleteMany();
  await prisma.hasilSubCPMK.deleteMany();
  await prisma.nilai.deleteMany();
  await prisma.distribusiSubCPMK.deleteMany();
  await prisma.tugas.deleteMany();
  await prisma.cpmkCpl.deleteMany();
  await prisma.cpmkSub.deleteMany();
  await prisma.cPMK.deleteMany();
  await prisma.subCPMK.deleteMany();
  await prisma.pendaftaranMK.deleteMany();
  await prisma.kelasMK.deleteMany();
  await prisma.penugasanDosenMK.deleteMany();
  await prisma.mataKuliah.deleteMany();
  await prisma.mahasiswa.deleteMany();
  await prisma.cPL.deleteMany();
  await prisma.dosen.deleteMany();
  await prisma.user.deleteMany({ where: { role: "DOSEN" } });
  await prisma.tahunAjaran.deleteMany();

  // Akun
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashDosen = await bcrypt.hash("dosen123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: hashAdmin, role: "ADMIN", email: "admin@example.com" },
  });

  const ta = await prisma.tahunAjaran.create({ data: { label: LABEL_TA, status: "AKTIF" } });

  const dosenByNip = new Map<string, string>();
  for (const d of DAFTAR_DOSEN) {
    const user = await prisma.user.create({ data: { username: d.nip, password: hashDosen, role: "DOSEN" } });
    const dosen = await prisma.dosen.create({ data: { nama: d.nama, gelar: d.gelar, nip: d.nip, userId: user.id } });
    dosenByNip.set(d.nip, dosen.id);
  }

  const cplId = new Map<string, string>();
  for (const c of CPL) cplId.set(c.kode, (await prisma.cPL.create({ data: c })).id);

  const mahasiswa = [];
  for (const [nim, nama] of MAHASISWA) {
    mahasiswa.push(await prisma.mahasiswa.create({ data: { nim, nama, angkatan: 2023 } }));
  }

  for (const [indeksMK, def] of MK.entries()) {
    const dosenId = dosenByNip.get(def.dosenNip);
    cek(!!dosenId, `dosen ${def.dosenNip} tidak ada`);

    const mk = await prisma.mataKuliah.create({
      data: { kode: def.kode, nama: def.nama, sks: def.sks, semester: def.semester },
    });
    await prisma.penugasanDosenMK.create({ data: { mataKuliahId: mk.id, dosenId: dosenId!, tahunAjaranId: ta.id } });
    for (const nama of def.kelas) {
      await prisma.kelasMK.create({ data: { nama, mataKuliahId: mk.id, dosenId: dosenId!, tahunAjaranId: ta.id } });
    }
    for (const m of mahasiswa) {
      await prisma.pendaftaranMK.create({ data: { mahasiswaId: m.id, mataKuliahId: mk.id, tahunAjaranId: ta.id } });
    }

    // Sub-CPMK milik MK ini
    const subId = new Map<number, string>();
    for (const s of def.subCpmk) {
      const baru = await prisma.subCPMK.create({
        data: { kode: `Sub-CPMK-${s.no}`, deskripsi: s.deskripsi, mataKuliahId: mk.id, tahunAjaranId: ta.id },
      });
      subId.set(s.no, baru.id);
    }

    // CPMK milik MK ini + kaitan CPL + kaitan Sub-CPMK (CpmkSub, ber-bobot)
    for (const c of def.cpmk) {
      const cpmk = await prisma.cPMK.create({
        data: { kode: `CPMK-${c.no}`, deskripsi: c.deskripsi, bobot: c.bobot, mataKuliahId: mk.id, tahunAjaranId: ta.id },
      });
      for (const kode of c.cpl) {
        await prisma.cpmkCpl.create({ data: { cpmkId: cpmk.id, cplId: cplId.get(kode)! } });
      }
      for (const s of c.sub) {
        await prisma.cpmkSub.create({ data: { cpmkId: cpmk.id, subCpmkId: subId.get(s.no)!, bobot: s.bobot } });
      }
    }

    // Tugas + distribusi Sub-CPMK. Dibuat berurutan agar urutan id (kode T1..Tn) sama dengan urutan definisi.
    const tugasBuat: { id: string; dinilai: boolean }[] = [];
    for (const t of def.tugas) {
      const tugas = await prisma.tugas.create({
        data: { nama: t.nama, pertemuanKe: t.pertemuanKe, bobot: t.bobot, mataKuliahId: mk.id, tahunAjaranId: ta.id },
      });
      await prisma.distribusiSubCPMK.createMany({
        data: t.sub.map((no) => ({ tugasId: tugas.id, subCpmkId: subId.get(no)!, sumber: "MANUAL" as const })),
      });
      tugasBuat.push({ id: tugas.id, dinilai: t.dinilai });
    }

    // Nilai (0–100) untuk tugas yang sudah "dinilai"; sisanya sengaja kosong
    // agar status tugas "berjalan"/"belum" terlihat di halaman Kelola Asesmen.
    const rnd = acak(1000 + indeksMK);
    for (const t of tugasBuat.filter((x) => x.dinilai)) {
      await prisma.nilai.createMany({
        data: mahasiswa.map((m, i) => ({
          mahasiswaId: m.id,
          tugasId: t.id,
          tahunAjaranId: ta.id,
          skor: Math.round((55 + rnd() * 40 - (i % 4) * 2) * 10) / 10,
        })),
      });
    }
  }

  console.log("Seed selesai.");
  console.log("  admin  : admin / admin123");
  console.log(`  dosen  : ${DAFTAR_DOSEN.length} akun, username = NIP, password dosen123`);
  console.log("  MK terisi lengkap: RL -> Diana Rahmawati (197910252008012020), ET -> Miftachul Ulum (197608122009121001)");
  console.log("  Catatan: tabel HasilSubCPMK/HasilCPMK/HasilCPL belum diisi; jalankan hitung ulang per MK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());