-- DropForeignKey
ALTER TABLE "HasilCPL" DROP CONSTRAINT "HasilCPL_mahasiswaId_fkey";

-- DropForeignKey
ALTER TABLE "HasilCPMK" DROP CONSTRAINT "HasilCPMK_mahasiswaId_fkey";

-- DropForeignKey
ALTER TABLE "HasilSubCPMK" DROP CONSTRAINT "HasilSubCPMK_mahasiswaId_fkey";

-- DropForeignKey
ALTER TABLE "Nilai" DROP CONSTRAINT "Nilai_mahasiswaId_fkey";

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPMK" ADD CONSTRAINT "HasilCPMK_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPL" ADD CONSTRAINT "HasilCPL_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
