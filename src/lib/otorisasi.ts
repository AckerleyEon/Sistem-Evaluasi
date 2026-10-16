import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";

export async function cekAksesMK(mataKuliahId: string) {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const ta = await getTahunAjaranAktif();
  if (!ta) return null;

  if (user.role === "ADMIN") return { ta };
  if (!user.dosenId) return null;

  const penugasan = await prisma.penugasanDosenMK.findFirst({
    where: { mataKuliahId, tahunAjaranId: ta.id, dosenId: user.dosenId },
  });
  return penugasan ? { ta } : null;
}

export async function pastikanPengelolaMK(mataKuliahId: string) {
  const akses = await cekAksesMK(mataKuliahId);
  if (!akses) throw new Error("Anda tidak berhak mengelola mata kuliah ini di Tahun Ajaran aktif.");
  return akses;
}