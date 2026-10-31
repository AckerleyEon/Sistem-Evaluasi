CREATE TYPE "JenisAktivitasDosen" AS ENUM ('NILAI', 'ASESMEN', 'DISTRIBUSI');

CREATE TABLE "AktivitasDosen" (
    "id" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "jenis" "JenisAktivitasDosen" NOT NULL,
    "pelaku" TEXT NOT NULL,
    "mataKuliah" TEXT NOT NULL,
    "kelas" TEXT,
    "aksi" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AktivitasDosen_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AktivitasDosen_tahunAjaranId_createdAt_idx" ON "AktivitasDosen"("tahunAjaranId", "createdAt");

ALTER TABLE "AktivitasDosen" ADD CONSTRAINT "AktivitasDosen_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
