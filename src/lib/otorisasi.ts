import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";

export async function cekAksesMK(mataKuliahId: string, kelasId?: string) {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const ta = await getTahunAjaranAktif();
  if (!ta) return null;

  if (user.role === "ADMIN") {
    if (kelasId) {
      const kelas = await prisma.kelasMK.findFirst({
        where: { id: kelasId, mataKuliahId, tahunAjaranId: ta.id },
        select: { id: true },
      });
      if (!kelas) return null;
    }
    return { ta, kelasId: kelasId ?? null, koordinator: true };
  }
  if (!user.dosenId) return null;

  const penugasan = await prisma.penugasanDosenMK.findFirst({
    where: { mataKuliahId, tahunAjaranId: ta.id, dosenId: user.dosenId },
  });
  if (penugasan) {
    if (kelasId) {
      const kelas = await prisma.kelasMK.findFirst({
        where: { id: kelasId, mataKuliahId, tahunAjaranId: ta.id },
        select: { id: true },
      });
      if (!kelas) return null;
    }
    return { ta, kelasId: kelasId ?? null, koordinator: true };
  }
  const kelas = await prisma.kelasMK.findFirst({
    where: { ...(kelasId ? { id: kelasId } : {}), mataKuliahId, tahunAjaranId: ta.id, dosenId: user.dosenId },
    select: { id: true },
    orderBy: { nama: "asc" },
  });
  return kelas ? { ta, kelasId: kelas.id, koordinator: false } : null;
}

export async function pastikanPengelolaMK(mataKuliahId: string, kelasId?: string) {
  const akses = await cekAksesMK(mataKuliahId, kelasId);
  if (!akses || (!akses.koordinator && !kelasId)) {
    throw new Error("Anda tidak berhak mengelola mata kuliah atau kelas ini di Tahun Ajaran aktif.");
  }
  return akses;
}