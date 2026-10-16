import { prisma } from "@/lib/prisma";

export async function getTahunAjaranAktif() {
  return prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" } });
}

export async function getSemuaTahunAjaran() {
  return prisma.tahunAjaran.findMany({ orderBy: { label: "desc" } });
}