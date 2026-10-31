CREATE TABLE "ProfilLulusan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilLulusan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfilLulusanCpl" (
    "id" TEXT NOT NULL,
    "profilLulusanId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,

    CONSTRAINT "ProfilLulusanCpl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HasilProfilLulusan" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "profilLulusanId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "statusLengkap" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HasilProfilLulusan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfilLulusan_kode_key" ON "ProfilLulusan"("kode");

CREATE UNIQUE INDEX "ProfilLulusanCpl_profilLulusanId_cplId_key" ON "ProfilLulusanCpl"("profilLulusanId", "cplId");

CREATE UNIQUE INDEX "HasilProfilLulusan_mahasiswaId_profilLulusanId_tahunAjaranI_key" ON "HasilProfilLulusan"("mahasiswaId", "profilLulusanId", "tahunAjaranId");

ALTER TABLE "ProfilLulusanCpl" ADD CONSTRAINT "ProfilLulusanCpl_profilLulusanId_fkey" FOREIGN KEY ("profilLulusanId") REFERENCES "ProfilLulusan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfilLulusanCpl" ADD CONSTRAINT "ProfilLulusanCpl_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HasilProfilLulusan" ADD CONSTRAINT "HasilProfilLulusan_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HasilProfilLulusan" ADD CONSTRAINT "HasilProfilLulusan_profilLulusanId_fkey" FOREIGN KEY ("profilLulusanId") REFERENCES "ProfilLulusan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HasilProfilLulusan" ADD CONSTRAINT "HasilProfilLulusan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
