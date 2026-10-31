import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const deleted = await prisma.$transaction(async (tx) => {
    const [kelasTanpaDosen] = await tx.$queryRaw<{ jumlah: bigint }[]>`
      SELECT COUNT(*) AS jumlah FROM "KelasMK" WHERE "dosenId" IS NULL
    `;
    if (kelasTanpaDosen.jumlah > 0) {
      throw new Error(`Dibatalkan: ${kelasTanpaDosen.jumlah} kelas masih tanpa pengampu.`);
    }

    const pendaftaran = await tx.$executeRaw`DELETE FROM "PendaftaranMK" WHERE "kelasId" IS NULL`;
    const tugas = await tx.$executeRaw`DELETE FROM "Tugas" WHERE "kelasId" IS NULL`;
    return { pendaftaran, tugas };
  });
  console.log(JSON.stringify(deleted));
}

main().finally(() => prisma.$disconnect());
