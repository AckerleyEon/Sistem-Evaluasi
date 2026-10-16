/*
  Warnings:

  - You are about to drop the column `bobot` on the `SubCPMK` table. All the data in the column will be lost.
  - You are about to drop the column `cpmkId` on the `SubCPMK` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mahasiswaId,subCpmkId,mataKuliahId,tahunAjaranId]` on the table `HasilSubCPMK` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mataKuliahId` to the `HasilSubCPMK` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SubCPMK" DROP CONSTRAINT "SubCPMK_cpmkId_fkey";

-- DropIndex
DROP INDEX "HasilSubCPMK_mahasiswaId_subCpmkId_tahunAjaranId_key";

-- AlterTable
ALTER TABLE "HasilSubCPMK" ADD COLUMN     "mataKuliahId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubCPMK" DROP COLUMN "bobot",
DROP COLUMN "cpmkId";

-- CreateTable
CREATE TABLE "CpmkSub" (
    "id" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,
    "subCpmkId" TEXT NOT NULL,
    "bobot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CpmkSub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CpmkSub_cpmkId_subCpmkId_key" ON "CpmkSub"("cpmkId", "subCpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilSubCPMK_mahasiswaId_subCpmkId_mataKuliahId_tahunAjaran_key" ON "HasilSubCPMK"("mahasiswaId", "subCpmkId", "mataKuliahId", "tahunAjaranId");

-- AddForeignKey
ALTER TABLE "CpmkSub" ADD CONSTRAINT "CpmkSub_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpmkSub" ADD CONSTRAINT "CpmkSub_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
