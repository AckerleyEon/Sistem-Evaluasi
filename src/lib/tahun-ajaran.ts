import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_TAHUN_AJARAN_DOSEN = "dosen-tahun-ajaran";

export async function getTahunAjaranAktif() {
  return prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" } });
}

export async function getSemuaTahunAjaran() {
  return prisma.tahunAjaran.findMany({ orderBy: { label: "desc" } });
}

export async function getKonteksTahunAjaranDosen(dosenId: string) {
  const [terdaftar, aktif, cookie] = await Promise.all([
    prisma.tahunAjaran.findMany({
      where: {
        OR: [
          { penugasanDosen: { some: { dosenId } } },
          { kelasMK: { some: { dosenId } } },
        ],
      },
      orderBy: { label: "desc" },
    }),
    getTahunAjaranAktif(),
    cookies(),
  ]);
  const daftar = [...terdaftar];
  if (aktif && !daftar.some((item) => item.id === aktif.id)) daftar.unshift(aktif);
  const selectedId = cookie.get(COOKIE_TAHUN_AJARAN_DOSEN)?.value;
  const selected = daftar.find((item) => item.id === selectedId) ?? aktif ?? daftar[0] ?? null;
  return { daftar, selected };
}

export async function getTahunAjaranDosen(dosenId: string) {
  return (await getKonteksTahunAjaranDosen(dosenId)).selected;
}
