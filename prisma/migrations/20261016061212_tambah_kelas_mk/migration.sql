-- AlterTable
ALTER TABLE "MataKuliah" ADD COLUMN     "semester" INTEGER;

-- CreateTable
CREATE TABLE "KelasMK" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KelasMK_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KelasMK_mataKuliahId_tahunAjaranId_nama_key" ON "KelasMK"("mataKuliahId", "tahunAjaranId", "nama");

-- AddForeignKey
ALTER TABLE "KelasMK" ADD CONSTRAINT "KelasMK_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMK" ADD CONSTRAINT "KelasMK_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMK" ADD CONSTRAINT "KelasMK_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
