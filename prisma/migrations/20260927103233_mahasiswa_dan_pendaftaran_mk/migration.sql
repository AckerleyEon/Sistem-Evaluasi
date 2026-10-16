/*
  Warnings:

  - Added the required column `angkatan` to the `Mahasiswa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Mahasiswa" ADD COLUMN     "angkatan" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "PendaftaranMK" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendaftaranMK_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendaftaranMK_mahasiswaId_mataKuliahId_key" ON "PendaftaranMK"("mahasiswaId", "mataKuliahId");

-- AddForeignKey
ALTER TABLE "PendaftaranMK" ADD CONSTRAINT "PendaftaranMK_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendaftaranMK" ADD CONSTRAINT "PendaftaranMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
