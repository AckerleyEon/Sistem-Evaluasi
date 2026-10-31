import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif, getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export async function cekAksesMK(mataKuliahId: string, kelasId?: string) {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const ta = user.role === "DOSEN" && user.dosenId
    ? await getTahunAjaranDosen(user.dosenId)
    : await getTahunAjaranAktif();
  if (!ta) return null;

  if (user.role === "ADMIN") {
    const kelas = await prisma.kelasMK.findFirst({
      where: { ...(kelasId ? { id: kelasId } : {}), mataKuliahId, tahunAjaranId: ta.id },
      select: { id: true },
      orderBy: { nama: "asc" },
    });
    return kelas ? { ta, kelasId: kelas.id, koordinator: true } : null;
  }
  if (!user.dosenId) return null;

  const penugasan = await prisma.penugasanDosenMK.findFirst({
    where: { mataKuliahId, tahunAjaranId: ta.id, dosenId: user.dosenId },
  });
  if (penugasan) {
    const kelas = await prisma.kelasMK.findFirst({
      where: { ...(kelasId ? { id: kelasId } : {}), mataKuliahId, tahunAjaranId: ta.id },
      select: { id: true },
      orderBy: { nama: "asc" },
    });
    return kelas ? { ta, kelasId: kelas.id, koordinator: true } : null;
  }
  const kelas = await prisma.kelasMK.findFirst({
    where: { ...(kelasId ? { id: kelasId } : {}), mataKuliahId, tahunAjaranId: ta.id, dosenId: user.dosenId },
    select: { id: true },
    orderBy: { nama: "asc" },
  });
  return kelas ? { ta, kelasId: kelas.id, koordinator: false } : null;
}

export async function pastikanPengelolaMK(mataKuliahId: string, kelasId: string) {
  if (!kelasId) throw new Error("Pilih kelas yang akan dikelola.");
  const akses = await cekAksesMK(mataKuliahId, kelasId);
  if (!akses) {
    throw new Error("Anda tidak berhak mengelola mata kuliah atau kelas ini pada Tahun Ajaran yang dipilih.");
  }
  if (akses.ta.status !== "AKTIF") throw new Error("Tahun Ajaran arsip hanya dapat dilihat; perubahan data dinonaktifkan.");
  return akses;
}