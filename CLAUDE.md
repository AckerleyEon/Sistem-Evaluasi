# CLAUDE.md — Sistem Pengukuran CPL Berbasis OBE

## Konteks Project
Skripsi: "Rancang Bangun Sistem Pengukuran Capaian Pembelajaran Lulusan Berbasis OBE
Menggunakan Metode Waterfall pada Program Studi Teknik Elektro Universitas Trunojoyo Madura."

Alur data: Profil Lulusan → CPL → CPMK → Sub-CPMK → Komponen Penilaian/Tugas → Nilai Mahasiswa → Pengukuran Capaian.

Masalah inti yang diselesaikan sistem ini: distribusi Sub-CPMK ke Tugas tidak selalu
lengkap dikaitkan manual oleh dosen (jumlah tugas per mata kuliah bervariasi, tidak semua
Sub-CPMK punya tugas terkait) — sistem menyediakan mekanisme distribusi otomatis (round-robin)
untuk Sub-CPMK yang belum terhubung.

## Tech Stack
- Next.js (App Router) + TypeScript
- PostgreSQL (lokal via Laragon)
- Prisma ORM v7 — PENTING: connection URL ada di `prisma7.config.ts` (via `DATABASE_URL`
  di `.env`), BUKAN di `datasource` block dalam `schema.prisma`. PrismaClient runtime
  wajib pakai driver adapter (`@prisma/adapter-pg`), lihat `src/lib/prisma.ts`.
- Auth: NextAuth (Auth.js v5), Credentials provider + JWT session (TANPA Prisma adapter —
  User model custom, bukan skema bawaan Auth.js). Password di-hash dengan `bcryptjs`.

## Struktur Folder
```
src/
├── app/
│   ├── (auth)/login/
│   ├── (admin)/{data-master,pengguna,laporan}/
│   ├── (dosen)/{komponen-penilaian,input-nilai,laporan}/
│   └── api/{auth,data-master,komponen-penilaian,distribusi,nilai,perhitungan}/
├── lib/
│   ├── prisma.ts          # Prisma client + adapter singleton
│   ├── distribusi/roundRobin.ts
│   └── perhitungan/{hitungSubCPMK,hitungCPMK,hitungCPL}.ts
├── auth.config.ts          # config edge-safe (dipakai middleware)
├── auth.ts                 # config lengkap (Credentials provider, server-only)
└── middleware.ts
```
Prinsip: logika distribusi & perhitungan dipisah ke `lib/`, tidak ditulis langsung
di route API — supaya bisa diuji terpisah dan tetap fokus satu fungsi per sesi coding.

## Skema Data (schema.prisma)
Model: User, Dosen, Mahasiswa, MataKuliah, CPL, CPMK, SubCPMK, Tugas,
DistribusiSubCPMK, Nilai, HasilSubCPMK, HasilCPMK, HasilCPL.

`HasilSubCPMK`/`HasilCPMK`/`HasilCPL` adalah hasil TURUNAN (dihitung sistem), terpisah
dari `Nilai` (input asli dosen). Ketiganya punya field `statusLengkap: Boolean`.

## Aturan Bisnis (FINAL — jangan diubah tanpa konfirmasi ulang)

**Distribusi Round-Robin:**
- Tugas yang sudah dikaitkan manual oleh dosen (`DistribusiSubCPMK.sumber = MANUAL`)
  diprioritaskan dan TIDAK ikut diproses ulang round-robin.
- Hanya Sub-CPMK yang belum punya relasi `DistribusiSubCPMK` sama sekali yang masuk
  antrian distribusi otomatis (`sumber = OTOMATIS`).
- Jika Sub-CPMK tersisa > jumlah tugas, satu tugas boleh menerima lebih dari satu
  Sub-CPMK — round-robin berputar lagi dari tugas pertama.

**Perhitungan Berjenjang:**
- Sub-CPMK = rata-rata BERBOBOT dari nilai Tugas terkait (bobot dari field `Tugas.bobot`).
- CPMK = agregasi dari HasilSubCPMK di bawahnya. CPL = agregasi dari HasilCPMK di bawahnya.
- Jika mahasiswa belum punya nilai di salah satu tugas terkait suatu Sub-CPMK: tugas itu
  DIABAIKAN dari rata-rata berbobot (bobot lain dinormalisasi ulang), tapi hasilnya
  ditandai `statusLengkap: false`.

## Status Implementasi (update manual setiap progres)
- [x] Setup Next.js + Prisma + PostgreSQL (Laragon, db `evaluasi-db`)
- [x] schema.prisma lengkap + migrasi awal berhasil
- [x] Prisma Client singleton dengan adapter (`src/lib/prisma.ts`)
- [x] NextAuth (Credentials + JWT), route handler, middleware, type augmentation
- [x] seed.ts (data uji: admin, dosen, 2 MK kontras)
- [x] Halaman /login (UI)
- [x] CRUD Data Master (MK, CPL, CPMK, Sub-CPMK)
- [x] Mesin distribusi round-robin
- [ ] Input nilai
- [ ] Perhitungan berjenjang
- [ ] Laporan

## Konvensi
- Bahasa penamaan: Indonesia untuk domain/istilah akademik (SubCPMK, MataKuliah, dst),
  Inggris untuk hal teknis generik (helper, util, handler).
- id pakai `cuid()`, bukan auto-increment integer.