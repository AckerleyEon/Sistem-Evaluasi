ALTER TABLE "HasilCPMK" ADD COLUMN "mataKuliahId" TEXT;

UPDATE "HasilCPMK" AS hasil
SET "mataKuliahId" = cpmk."mataKuliahId"
FROM "CPMK" AS cpmk
WHERE hasil."cpmkId" = cpmk."id";

ALTER TABLE "HasilCPMK" ALTER COLUMN "mataKuliahId" SET NOT NULL;

DROP INDEX "HasilCPMK_mahasiswaId_cpmkId_tahunAjaranId_key";

CREATE UNIQUE INDEX "HasilCPMK_mahasiswaId_cpmkId_mataKuliahId_tahunAjaranId_key"
ON "HasilCPMK"("mahasiswaId", "cpmkId", "mataKuliahId", "tahunAjaranId");

ALTER TABLE "HasilCPMK"
ADD CONSTRAINT "HasilCPMK_mataKuliahId_fkey"
FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
