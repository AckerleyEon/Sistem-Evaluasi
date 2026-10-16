"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola CPL.");
  }
}

export async function createCPL(formData: FormData) {
  await pastikanAdmin();
  const kode = formData.get("kode") as string;
  const deskripsi = formData.get("deskripsi") as string;

  await prisma.cPL.create({ data: { kode, deskripsi } });

  revalidatePath("/admin/data-master/cpl");
  redirect(`/admin/data-master/cpl?berhasil=${encodeURIComponent(kode)}`);
}

export async function updateDeskripsiCPL(id: string, formData: FormData) {
  await pastikanAdmin();
  const deskripsi = ((formData.get("deskripsi") as string) ?? "").trim();

  if (!deskripsi) return { error: "Deskripsi tidak boleh kosong." };
  if (deskripsi.length > 500) return { error: "Deskripsi maksimal 500 karakter." };

  const cpl = await prisma.cPL.update({ where: { id }, data: { deskripsi } });

  revalidatePath("/admin/data-master/cpl");
  return { ok: true, kode: cpl.kode };
}

export async function deleteCPL(formData: FormData) {
  await pastikanAdmin();
  const id = formData.get("id") as string;
  await prisma.cPL.delete({ where: { id } });
  revalidatePath("/admin/data-master/cpl");
}

export async function hitungCpmkTerkait(cplId: string) {
  return prisma.cpmkCpl.count({ where: { cplId } });
}