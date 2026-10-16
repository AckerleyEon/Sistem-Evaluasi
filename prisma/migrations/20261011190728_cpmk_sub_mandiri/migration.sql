/*
  Warnings:

  - A unique constraint covering the columns `[kode,tahunAjaranId]` on the table `CPMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kode,tahunAjaranId]` on the table `SubCPMK` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CPMK" DROP CONSTRAINT "CPMK_mataKuliahId_fkey";

-- DropForeignKey
ALTER TABLE "SubCPMK" DROP CONSTRAINT "SubCPMK_cpmkId_fkey";

-- DropIndex
DROP INDEX "CPMK_kode_mataKuliahId_tahunAjaranId_key";

-- DropIndex
DROP INDEX "SubCPMK_kode_cpmkId_key";

-- AlterTable
ALTER TABLE "CPMK" ALTER COLUMN "mataKuliahId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubCPMK" ALTER COLUMN "cpmkId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_kode_tahunAjaranId_key" ON "CPMK"("kode", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCPMK_kode_tahunAjaranId_key" ON "SubCPMK"("kode", "tahunAjaranId");

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE SET NULL ON UPDATE CASCADE;
