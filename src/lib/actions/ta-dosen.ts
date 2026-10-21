"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_TAHUN_AJARAN_DOSEN } from "@/lib/tahun-ajaran";

export async function pilihTahunAjaranDosen(tahunAjaranId: string) {
  const session = await auth();
  const dosenId = session?.user?.dosenId;
  if (!session?.user || session.user.role !== "DOSEN" || !dosenId) {
    throw new Error("Sesi dosen tidak valid. Silakan login ulang.");
  }

  const ta = await prisma.tahunAjaran.findFirst({
    where: {
      id: tahunAjaranId,
      OR: [
        { status: "AKTIF" },
        { penugasanDosen: { some: { dosenId } } },
        { kelasMK: { some: { dosenId } } },
      ],
    },
    select: { id: true },
  });
  if (!ta) throw new Error("Tahun Ajaran tidak tersedia untuk akun dosen ini.");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_TAHUN_AJARAN_DOSEN, ta.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
