# Hardcode Sistem Evaluasi CPL

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Geist.

## Data Dummy Mahasiswa

Untuk membuat 20 mahasiswa dummy per angkatan (2022–2025) dan mendaftarkannya pada setiap mata kuliah di setiap tahun ajaran yang tersedia, jalankan:

```bash
npm run seed:mahasiswa-dummy
```

Perintah ini aman dijalankan ulang. Nilai dibuat untuk tugas yang sudah ada, lalu hasil capaian dihitung ulang. Data operasional yang sudah ada tidak dihapus.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deploy on Vercel

The easiest way to deploy this app is to use the [Vercel Platform](https://vercel.com/new) to deploy your Next.js application.