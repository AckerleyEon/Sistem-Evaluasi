/*
  Warnings:

  - You are about to drop the column `dosenId` on the `MataKuliah` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[kode,mataKuliahId,tahunAjaranId]` on the table `CPMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mahasiswaId,cplId,tahunAjaranId]` on the table `HasilCPL` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mahasiswaId,cpmkId,tahunAjaranId]` on the table `HasilCPMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mahasiswaId,subCpmkId,tahunAjaranId]` on the table `HasilSubCPMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mahasiswaId,mataKuliahId,tahunAjaranId]` on the table `PendaftaranMK` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tahunAjaranId` to the `CPMK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `HasilCPL` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `HasilCPMK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `HasilSubCPMK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `Nilai` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `PendaftaranMK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `SubCPMK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunAjaranId` to the `Tugas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusTahunAjaran" AS ENUM ('AKTIF', 'ARSIP');

-- DropForeignKey
ALTER TABLE "MataKuliah" DROP CONSTRAINT "MataKuliah_dosenId_fkey";

-- DropIndex
DROP INDEX "CPMK_kode_mataKuliahId_key";

-- DropIndex
DROP INDEX "HasilCPL_mahasiswaId_cplId_key";

-- DropIndex
DROP INDEX "HasilCPMK_mahasiswaId_cpmkId_key";

-- DropIndex
DROP INDEX "HasilSubCPMK_mahasiswaId_subCpmkId_key";

-- DropIndex
DROP INDEX "PendaftaranMK_mahasiswaId_mataKuliahId_key";

-- AlterTable
ALTER TABLE "CPMK" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HasilCPL" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HasilCPMK" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HasilSubCPMK" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MataKuliah" DROP COLUMN "dosenId";

-- AlterTable
ALTER TABLE "Nilai" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PendaftaranMK" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubCPMK" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tugas" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TahunAjaran" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "StatusTahunAjaran" NOT NULL DEFAULT 'ARSIP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenugasanDosenMK" (
    "id" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,

    CONSTRAINT "PenugasanDosenMK_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TahunAjaran_label_key" ON "TahunAjaran"("label");

-- CreateIndex
CREATE UNIQUE INDEX "PenugasanDosenMK_mataKuliahId_tahunAjaranId_key" ON "PenugasanDosenMK"("mataKuliahId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_kode_mataKuliahId_tahunAjaranId_key" ON "CPMK"("kode", "mataKuliahId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilCPL_mahasiswaId_cplId_tahunAjaranId_key" ON "HasilCPL"("mahasiswaId", "cplId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilCPMK_mahasiswaId_cpmkId_tahunAjaranId_key" ON "HasilCPMK"("mahasiswaId", "cpmkId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilSubCPMK_mahasiswaId_subCpmkId_tahunAjaranId_key" ON "HasilSubCPMK"("mahasiswaId", "subCpmkId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "PendaftaranMK_mahasiswaId_mataKuliahId_tahunAjaranId_key" ON "PendaftaranMK"("mahasiswaId", "mataKuliahId", "tahunAjaranId");

-- AddForeignKey
ALTER TABLE "PenugasanDosenMK" ADD CONSTRAINT "PenugasanDosenMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenugasanDosenMK" ADD CONSTRAINT "PenugasanDosenMK_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenugasanDosenMK" ADD CONSTRAINT "PenugasanDosenMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendaftaranMK" ADD CONSTRAINT "PendaftaranMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPMK" ADD CONSTRAINT "HasilCPMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPL" ADD CONSTRAINT "HasilCPL_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
