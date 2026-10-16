import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [hasilCPL, totalSubCpmk, subCpmkTerhubung] = await Promise.all([
    prisma.hasilCPL.findMany({ select: { nilai: true } }),
    prisma.subCPMK.count(),
    prisma.subCPMK.count({ where: { distribusi: { some: {} } } }),
  ]);

  const rataCapaianCpl =
    hasilCPL.length > 0
      ? Math.round((hasilCPL.reduce((sum, h) => sum + h.nilai, 0) / hasilCPL.length) * 10) / 10
      : 0;

  const persenMatriksTerpetakan =
    totalSubCpmk > 0 ? Math.round((subCpmkTerhubung / totalSubCpmk) * 1000) / 10 : 0;

  return NextResponse.json({ rataCapaianCpl, persenMatriksTerpetakan });
}