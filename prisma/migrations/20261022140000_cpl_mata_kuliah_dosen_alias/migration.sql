ALTER TABLE "Dosen" ADD COLUMN "alias" TEXT;

CREATE UNIQUE INDEX "Dosen_alias_key" ON "Dosen"("alias");

CREATE TABLE "MataKuliahCpl" (
    "id" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,
    CONSTRAINT "MataKuliahCpl_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MataKuliahCpl" ("id", "mataKuliahId", "cplId")
SELECT MIN("CpmkCpl"."id"), "CPMK"."mataKuliahId", "CpmkCpl"."cplId"
FROM "CpmkCpl"
INNER JOIN "CPMK" ON "CPMK"."id" = "CpmkCpl"."cpmkId"
GROUP BY "CPMK"."mataKuliahId", "CpmkCpl"."cplId";

CREATE UNIQUE INDEX "MataKuliahCpl_mataKuliahId_cplId_key"
ON "MataKuliahCpl"("mataKuliahId", "cplId");

ALTER TABLE "MataKuliahCpl"
ADD CONSTRAINT "MataKuliahCpl_mataKuliahId_fkey"
FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MataKuliahCpl"
ADD CONSTRAINT "MataKuliahCpl_cplId_fkey"
FOREIGN KEY ("cplId") REFERENCES "CPL"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "CpmkCpl";
