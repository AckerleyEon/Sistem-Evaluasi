import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaSchemaVersion: string | undefined;
};

const prismaSchemaVersion = "20261017110000_pendaftaran_dan_tugas_per_kelas";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const cachedPrisma = globalForPrisma.prisma;

export const prisma =
    cachedPrisma &&
    globalForPrisma.prismaSchemaVersion === prismaSchemaVersion &&
    typeof cachedPrisma.pengaturan?.findUnique === "function"
        ? cachedPrisma
        : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}