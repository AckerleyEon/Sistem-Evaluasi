import { prisma } from "@/lib/prisma";

export type ItemKaitkan = { id: string; bobot: number };

// Membaca daftar {id, bobot} dari form. Mengembalikan null kalau bentuknya tidak valid.
export function parseItemKaitkan(json: string): ItemKaitkan[] | null {
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return null;
    const hasil: ItemKaitkan[] = [];
    for (const d of data) {
      if (typeof d !== "object" || d === null) return null;
      const { id, bobot } = d as { id?: unknown; bobot?: unknown };
      if (typeof id !== "string" || typeof bobot !== "number") return null;
      if (!Number.isInteger(bobot) || bobot < 1 || bobot > 100) return null;
      hasil.push({ id, bobot });
    }
    return hasil;
  } catch {
    return null;
  }
}

// Sub-CPMK yang tidak lagi terkait ke CPMK manapun kehilangan pemetaannya ke tugas mata kuliah ini.
// Nilai mahasiswa tidak disentuh. Yang masih terkait ke CPMK lain dibiarkan.
export async function bersihkanDistribusiYatim(subIds: string[], mataKuliahId: string) {
  if (subIds.length === 0) return;

  const masihTerkait = await prisma.cpmkSub.findMany({
    where: { subCpmkId: { in: subIds } },
    select: { subCpmkId: true },
  });
  const aman = new Set(masihTerkait.map((m) => m.subCpmkId));
  const yatim = subIds.filter((id) => !aman.has(id));
  if (yatim.length === 0) return;

  await prisma.distribusiSubCPMK.deleteMany({
    where: { subCpmkId: { in: yatim }, tugas: { mataKuliahId } },
  });
}