DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "KelasMK" WHERE "dosenId" IS NULL) THEN
    RAISE EXCEPTION 'Assign a lecturer to every class before applying migration 20261031120000_wajib_kelas_dan_pengampu.';
  END IF;

  IF EXISTS (SELECT 1 FROM "PendaftaranMK" WHERE "kelasId" IS NULL) THEN
    RAISE EXCEPTION 'Assign every student registration to a class before applying migration 20261031120000_wajib_kelas_dan_pengampu.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Tugas" WHERE "kelasId" IS NULL) THEN
    RAISE EXCEPTION 'Assign every task to a class before applying migration 20261031120000_wajib_kelas_dan_pengampu.';
  END IF;
END $$;

ALTER TABLE "KelasMK" DROP CONSTRAINT "KelasMK_dosenId_fkey";
ALTER TABLE "KelasMK" ALTER COLUMN "dosenId" SET NOT NULL;
ALTER TABLE "KelasMK"
ADD CONSTRAINT "KelasMK_dosenId_fkey"
FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PendaftaranMK" DROP CONSTRAINT "PendaftaranMK_kelasId_fkey";
ALTER TABLE "PendaftaranMK" ALTER COLUMN "kelasId" SET NOT NULL;
ALTER TABLE "PendaftaranMK"
ADD CONSTRAINT "PendaftaranMK_kelasId_fkey"
FOREIGN KEY ("kelasId") REFERENCES "KelasMK"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tugas" DROP CONSTRAINT "Tugas_kelasId_fkey";
ALTER TABLE "Tugas" ALTER COLUMN "kelasId" SET NOT NULL;
ALTER TABLE "Tugas"
ADD CONSTRAINT "Tugas_kelasId_fkey"
FOREIGN KEY ("kelasId") REFERENCES "KelasMK"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
