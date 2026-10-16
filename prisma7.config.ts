import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",   // ← baris baru ini yang ditambahkan
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
