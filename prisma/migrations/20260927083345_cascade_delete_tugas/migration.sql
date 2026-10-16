-- DropForeignKey
ALTER TABLE "DistribusiSubCPMK" DROP CONSTRAINT "DistribusiSubCPMK_tugasId_fkey";

-- DropForeignKey
ALTER TABLE "Nilai" DROP CONSTRAINT "Nilai_tugasId_fkey";

-- AddForeignKey
ALTER TABLE "DistribusiSubCPMK" ADD CONSTRAINT "DistribusiSubCPMK_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
