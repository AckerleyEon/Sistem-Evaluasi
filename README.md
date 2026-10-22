# Sistem Evaluasi CPL (Berbasis OBE)

Sistem pengukuran Capaian Pembelajaran Lulusan (CPL) berbasis *Outcome-Based Education* untuk Program Studi Teknik Elektro, Universitas Trunojoyo Madura. Dikembangkan sebagai skripsi dengan metode Waterfall.

Alur data yang dihitung sistem:

```
CPL → CPMK → Sub-CPMK → Komponen Penilaian (Tugas) → Nilai Mahasiswa → Capaian
```

Sub-CPMK yang belum dikaitkan dosen ke tugas dibagikan otomatis secara merata (round-robin), lalu nilai dihitung berjenjang dari tugas sampai CPL.

## Fitur

**Admin Program Studi**
- Data master: CPL dipetakan ke mata kuliah; seluruh CPMK pada mata kuliah tersebut mewarisi pemetaan CPL. CPMK, Sub-CPMK, kelas, dan mahasiswa dapat dikelola atau diimpor melalui Excel.
- Kelola akun dosen, penugasan pengampu, dan tahun ajaran (aktif/arsip).
- Dasbor capaian CPL, laporan per angkatan dan per mahasiswa, serta pengingat input nilai untuk dosen.
- Penanganan permintaan reset kata sandi dosen.

**Dosen**
- Menyusun komponen penilaian (tugas) dan memetakannya ke Sub-CPMK; distribusi otomatis untuk yang belum terpetakan.
- Input nilai manual atau impor Excel, dengan perhitungan ulang capaian otomatis.
- Dasbor dan laporan capaian mata kuliah yang diampu, termasuk unduhan portofolio.

## Teknologi

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL · NextAuth v5 (Credentials + JWT) · ExcelJS · Nodemailer.

## Menjalankan di komputer lokal

Prasyarat: Node.js 20 atau lebih baru (disarankan 22), dan PostgreSQL yang sudah berjalan.

1. Pasang dependensi:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env`, lalu isi nilainya:

   | Variabel | Keterangan |
   | --- | --- |
   | `DATABASE_URL` | Koneksi PostgreSQL |
   | `AUTH_SECRET` | Rahasia acak yang panjang (untuk sesi login dan hash OTP/token reset) |
   | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Pengirim email OTP reset sandi Admin (App Password Gmail) |

3. Siapkan database. Konfigurasi Prisma ada di `prisma7.config.ts` (bukan nama bawaan), jadi tambahkan `--config`:

   ```bash
   npx prisma migrate deploy --config prisma7.config.ts
   npx prisma db seed --config prisma7.config.ts
   ```

   Seed membuat data uji dan **menghapus data operasional yang ada**, jadi jangan dijalankan di database yang berisi data asli. Akun uji: admin `admin` / `admin123`, dosen memakai NIP sebagai username dengan kata sandi `dosen123`. Ganti segera bila dipakai di luar pengembangan.

4. Jalankan:

   ```bash
   npm run dev
   ```

   Buka <http://localhost:3000>.

Data mahasiswa dummy (20 per angkatan 2022–2025, terdaftar di setiap mata kuliah) bisa dibuat dengan `npm run seed:mahasiswa-dummy`. Aman diulang; data operasional yang ada tidak dihapus.

Setelah mengubah `prisma/schema.prisma`, buat migrasi dengan `npx prisma migrate dev --config prisma7.config.ts`, lalu `npx prisma generate --config prisma7.config.ts` (klien hasil generate disimpan di `generated/prisma`).

Template impor MK di `public/template-impor-mk.xlsx` menyediakan kolom `CPL-1` sampai `CPL-6`. Isi `1` untuk CPL yang dipetakan dan `0` atau kosong untuk CPL yang tidak dipetakan. Jika kolom-kolom CPL disertakan, impor akan mengganti pemetaan mata kuliah sesuai indikator tersebut; jika tidak disertakan, pemetaan yang sudah tersimpan tetap dipertahankan. Baris dengan kode MK yang sama harus memakai pemetaan CPL yang sama.

Impor CPMK dan Sub-CPMK tersedia pada menu Admin **CPMK & Sub-CPMK**. Template Excel dapat diunduh dari modal impor atau `public/template-impor-cpmk-subcpmk.xlsx`. Satu baris mewakili satu pemetaan CPMK ke Sub-CPMK. Kode mata kuliah harus cocok dengan Data Master; data diproses untuk Tahun Ajaran aktif. Bobot menerima nilai persen (mis. `50`) atau pecahan (mis. `0,5`). Baris bergalat ditampilkan dan dilewati; hanya baris valid yang diterapkan. Impor menambah atau memperbarui data yang tercantum, tidak menghapus data lain, dan memeriksa konsistensi deskripsi serta total bobot sebelum menerapkan perubahan.

Impor data penawaran TA 2022/2023 dari workbook di `public/` dapat dipratinjau tanpa mengubah database dengan `npm run import:ta-2022-2023`. Setelah memeriksa ringkasan, tambahkan `-- --apply` untuk mengganti kelas dan penugasan dosen TA tersebut, serta memperbarui nama, SKS, dan pemetaan CPL kurikulum global untuk mata kuliah yang cocok. Baris dosen yang tidak cocok dengan nama maupun alias dosen terdaftar diabaikan; alias dapat diatur pada Data Master Dosen. Skrip tidak membuat pendaftaran mahasiswa atau nilai.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build dan jalankan produksi |
| `npm test` | Tes unit (`node:test` + `tsx`) untuk rumus perhitungan, distribusi round-robin, dan utilitas keamanan |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run lint` | ESLint |

## Struktur kode

```
prisma/                 skema, migrasi, seed
src/app/
  (auth)/               login, lupa sandi, reset sandi (OTP dan tautan)
  (admin)/admin/        halaman Admin
  (dosen)/dosen/        halaman Dosen
  api/                  unduhan template/ekspor Excel dan CSV, status, ringkasan publik
src/components/         komponen UI per area (admin, dosen) dan komponen bersama
src/lib/
  actions/              server action (setiap fungsi wajib memeriksa hak akses)
  perhitungan/          rumus Sub-CPMK → CPMK → CPL dan hitung ulang per mata kuliah
  distribusi/           distribusi round-robin
  otorisasi.ts          aturan akses dosen/koordinator per mata kuliah dan kelas
  keamanan.ts, sandi.ts, rate-limit.ts   hash OTP/token, aturan sandi, pembatas percobaan
tests/                  tes unit
```

Logika perhitungan dan distribusi sengaja dipisah dari route dan server action agar bisa diuji sendiri. Aturan bisnis lengkap ada di [`CLAUDE.md`](CLAUDE.md).

## Keamanan

- Kata sandi di-hash dengan bcrypt; kode OTP dan token reset disimpan dalam bentuk hash (HMAC dengan `AUTH_SECRET`), bukan teks asli.
- Login dan verifikasi OTP dibatasi jumlah percobaannya. Pembatas bekerja di memori satu proses, jadi untuk penyebaran di banyak instance pindahkan penyimpanannya ke Redis atau database.
- Halaman lupa sandi memberi respons yang sama untuk semua username agar akun tidak bisa ditebak.
- Setiap server action dan route API memeriksa peran pengguna sendiri; middleware hanya melindungi halaman `/admin` dan `/dosen`.
- Sesi login berlaku 12 jam.
