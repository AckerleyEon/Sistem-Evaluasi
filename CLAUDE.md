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
prisma/                    schema.prisma, migrasi, seed.ts, seed-mahasiswa-dummy.ts
src/
├── app/
│   ├── (auth)/            login, lupa-sandi, reset-sandi/{otp,[token]}
│   ├── (admin)/admin/     data-master/{cpl,cpmk,mata-kuliah}, dosen, tahun-ajaran,
│   │                      laporan, permintaan-reset
│   ├── (dosen)/dosen/     komponen-penilaian, input-nilai, hasil
│   └── api/               auth, status, public/ringkasan, dan unduhan template/ekspor
│                          (admin/*, dosen/*)
├── components/            UI per area (admin/, dosen/) + komponen bersama
├── lib/
│   ├── actions/           server action ("use server"), satu file per domain
│   ├── perhitungan/       rumus, hitungSubCPMK/CPMK/CPL, hitungUlangMataKuliah
│   ├── distribusi/roundRobin.ts
│   ├── otorisasi.ts       akses dosen/koordinator per mata kuliah dan kelas
│   ├── keamanan.ts, sandi.ts, rate-limit.ts
│   └── prisma.ts          Prisma client + adapter singleton
├── auth.config.ts         config edge-safe (dipakai middleware)
├── auth.ts                config lengkap (Credentials provider, server-only)
└── middleware.ts          hanya melindungi halaman /admin dan /dosen
tests/                     tes unit (npm test)
```
Prinsip: logika distribusi & perhitungan dipisah ke `lib/`, tidak ditulis langsung
di route API — supaya bisa diuji terpisah dan tetap fokus satu fungsi per sesi coding.

## Skema Data (schema.prisma)
Model: User, PermintaanResetSandi, Pengaturan, TahunAjaran, Dosen, Mahasiswa, MataKuliah,
KelasMK, PenugasanDosenMK, PendaftaranMK, CPL, MataKuliahCpl, CPMK, SubCPMK, CpmkSub, Tugas,
DistribusiSubCPMK, Nilai, HasilSubCPMK, HasilCPMK, HasilCPL.

Pemetaan kurikulum CPL berada pada relasi global `MataKuliahCpl`; setiap CPMK operasional
mewarisi semua CPL yang dipetakan ke mata kuliahnya.

Data operasional (CPMK, Sub-CPMK, tugas, nilai, hasil) dipisah per `TahunAjaran`; CPL tetap
global. Tahun ajaran berstatus ARSIP hanya bisa dilihat.

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
- [x] schema.prisma lengkap + migrasi
- [x] Prisma Client singleton dengan adapter (`src/lib/prisma.ts`)
- [x] NextAuth (Credentials + JWT), route handler, middleware, type augmentation
- [x] seed.ts (data uji: admin, dosen, 2 MK kontras) dan seed mahasiswa dummy
- [x] Halaman /login (UI)
- [x] CRUD Data Master (MK, CPL, CPMK, Sub-CPMK) + impor Excel
- [x] Tahun ajaran, kelas mata kuliah, penugasan dosen, pendaftaran mahasiswa
- [x] Mesin distribusi round-robin
- [x] Input nilai (manual dan impor Excel)
- [x] Perhitungan berjenjang (`hitungUlangMataKuliah`)
- [x] Dasbor dan laporan (admin dan dosen)
- [x] Reset kata sandi (OTP email untuk Admin, tautan dari Admin untuk Dosen)
- [x] Tes unit rumus, distribusi, dan utilitas keamanan (`npm test`)
- [ ] Pembatas percobaan login/OTP yang dibagi antar-instance (saat ini di memori satu proses)
- [ ] Ganti `window.confirm` dengan dialog konfirmasi yang konsisten dengan UI

## Catatan Terbuka (butuh keputusan sebelum diubah)
- `hitungSubCPMK`: jika mahasiswa belum punya satu pun nilai untuk tugas-tugas sebuah Sub-CPMK,
  hasilnya disimpan sebagai 0 dengan `statusLengkap: false` dan ikut menurunkan rata-rata CPMK.
  Sub-CPMK yang tidak punya tugas sama sekali justru diabaikan. Konfirmasi apakah keduanya
  seharusnya diperlakukan sama.
- `finalisasiDistribusi` membagikan Sub-CPMK ke semua tugas mata kuliah, termasuk tugas yang khusus
  milik satu kelas. Sub-CPMK yang hanya jatuh ke tugas satu kelas tidak punya hasil untuk
  mahasiswa kelas lain. Konfirmasi apakah tujuan distribusi dibatasi ke tugas tingkat mata kuliah.

## Konvensi
- Bahasa penamaan: Indonesia untuk domain/istilah akademik (SubCPMK, MataKuliah, dst),
  Inggris untuk hal teknis generik (helper, util, handler).
- id pakai `cuid()`, bukan auto-increment integer.
- Setiap fungsi yang di-export dari file `"use server"` adalah endpoint publik. Wajib memeriksa
  hak akses di awal (`pastikanAdmin()`, `pastikanPengelolaMK()`, atau `auth()`). Satu-satunya
  pengecualian adalah alur reset sandi di `lib/actions/auth.ts` yang memang diakses sebelum login.
  Argumen dari client tidak boleh dipercaya bentuk dan isinya.
- Route API di `src/app/api/**` tidak dilindungi middleware (matcher hanya `/admin` dan `/dosen`),
  jadi tiap route memeriksa sesi sendiri.
- Kode OTP dan token reset disimpan sebagai hash (`hashRahasia`), jangan disimpan sebagai teks asli.
- Perubahan pada rumus atau distribusi harus disertai tes di `tests/`.
