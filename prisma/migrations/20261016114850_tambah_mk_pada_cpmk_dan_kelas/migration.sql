/*
  Warnings:

  - A unique constraint covering the columns `[mataKuliahId,tahunAjaranId,kode]` on the table `CPMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mataKuliahId,tahunAjaranId,kode]` on the table `SubCPMK` will be added. If there are existing duplicate values, this will fail.
  - Made the column `mataKuliahId` on table `CPMK` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `mataKuliahId` to the `SubCPMK` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CPMK" DROP CONSTRAINT "CPMK_mataKuliahId_fkey";

-- DropIndex
DROP INDEX "CPMK_kode_tahunAjaranId_key";

-- DropIndex
DROP INDEX "SubCPMK_kode_tahunAjaranId_key";

-- AlterTable
ALTER TABLE "CPMK" ALTER COLUMN "mataKuliahId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SubCPMK" ADD COLUMN     "mataKuliahId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_mataKuliahId_tahunAjaranId_kode_key" ON "CPMK"("mataKuliahId", "tahunAjaranId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "SubCPMK_mataKuliahId_tahunAjaranId_kode_key" ON "SubCPMK"("mataKuliahId", "tahunAjaranId", "kode");

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
