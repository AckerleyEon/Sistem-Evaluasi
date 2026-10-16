/*
  Warnings:

  - You are about to drop the column `cplId` on the `CPMK` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CPMK" DROP CONSTRAINT "CPMK_cplId_fkey";

-- DropForeignKey
ALTER TABLE "DistribusiSubCPMK" DROP CONSTRAINT "DistribusiSubCPMK_subCpmkId_fkey";

-- DropForeignKey
ALTER TABLE "HasilCPMK" DROP CONSTRAINT "HasilCPMK_cpmkId_fkey";

-- DropForeignKey
ALTER TABLE "HasilSubCPMK" DROP CONSTRAINT "HasilSubCPMK_subCpmkId_fkey";

-- DropForeignKey
ALTER TABLE "SubCPMK" DROP CONSTRAINT "SubCPMK_cpmkId_fkey";

-- AlterTable
ALTER TABLE "CPMK" DROP COLUMN "cplId",
ADD COLUMN     "bobot" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubCPMK" ADD COLUMN     "bobot" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CpmkCpl" (
    "id" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,

    CONSTRAINT "CpmkCpl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CpmkCpl_cpmkId_cplId_key" ON "CpmkCpl"("cpmkId", "cplId");

-- AddForeignKey
ALTER TABLE "CpmkCpl" ADD CONSTRAINT "CpmkCpl_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpmkCpl" ADD CONSTRAINT "CpmkCpl_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribusiSubCPMK" ADD CONSTRAINT "DistribusiSubCPMK_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPMK" ADD CONSTRAINT "HasilCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;
