-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOSEN');

-- CreateEnum
CREATE TYPE "SumberDistribusi" AS ENUM ('MANUAL', 'OTOMATIS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dosen" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mahasiswa" (
    "id" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Mahasiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MataKuliah" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sks" INTEGER NOT NULL,
    "dosenId" TEXT NOT NULL,

    CONSTRAINT "MataKuliah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPL" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,

    CONSTRAINT "CPL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPMK" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,

    CONSTRAINT "CPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCPMK" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,

    CONSTRAINT "SubCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tugas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "pertemuanKe" INTEGER NOT NULL,
    "bobot" DOUBLE PRECISION NOT NULL,
    "mataKuliahId" TEXT NOT NULL,

    CONSTRAINT "Tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribusiSubCPMK" (
    "id" TEXT NOT NULL,
    "subCpmkId" TEXT NOT NULL,
    "tugasId" TEXT NOT NULL,
    "sumber" "SumberDistribusi" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistribusiSubCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nilai" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "tugasId" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HasilSubCPMK" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "subCpmkId" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "statusLengkap" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HasilSubCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HasilCPMK" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "statusLengkap" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HasilCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HasilCPL" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "statusLengkap" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HasilCPL_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_nip_key" ON "Dosen"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_userId_key" ON "Dosen"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mahasiswa_nim_key" ON "Mahasiswa"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "MataKuliah_kode_key" ON "MataKuliah"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "CPL_kode_key" ON "CPL"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_kode_mataKuliahId_key" ON "CPMK"("kode", "mataKuliahId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCPMK_kode_cpmkId_key" ON "SubCPMK"("kode", "cpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "DistribusiSubCPMK_subCpmkId_tugasId_key" ON "DistribusiSubCPMK"("subCpmkId", "tugasId");

-- CreateIndex
CREATE UNIQUE INDEX "Nilai_mahasiswaId_tugasId_key" ON "Nilai"("mahasiswaId", "tugasId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilSubCPMK_mahasiswaId_subCpmkId_key" ON "HasilSubCPMK"("mahasiswaId", "subCpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilCPMK_mahasiswaId_cpmkId_key" ON "HasilCPMK"("mahasiswaId", "cpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilCPL_mahasiswaId_cplId_key" ON "HasilCPL"("mahasiswaId", "cplId");

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribusiSubCPMK" ADD CONSTRAINT "DistribusiSubCPMK_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribusiSubCPMK" ADD CONSTRAINT "DistribusiSubCPMK_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilSubCPMK" ADD CONSTRAINT "HasilSubCPMK_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPMK" ADD CONSTRAINT "HasilCPMK_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPMK" ADD CONSTRAINT "HasilCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPL" ADD CONSTRAINT "HasilCPL_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HasilCPL" ADD CONSTRAINT "HasilCPL_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
