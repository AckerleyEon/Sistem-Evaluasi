import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

async function updateCPL(id: string, formData: FormData) {
  "use server";

  const kode = String(formData.get("kode") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();

  if (!kode || !deskripsi) {
    throw new Error("Kode dan deskripsi wajib diisi.");
  }

  await prisma.cPL.update({
    where: { id },
    data: { kode, deskripsi },
  });

  redirect("/admin/data-master/cpl");
}

export const metadata: Metadata = { title: "Ubah CPL" };

export default async function EditCPLPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cpl = await prisma.cPL.findUnique({ where: { id } });
  if (!cpl) notFound();

  const updateWithId = updateCPL.bind(null, id);

  return (
    <div className="p-6 max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Edit CPL</h1>
      <form action={updateWithId} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Kode</label>
          <input name="kode" defaultValue={cpl.kode} required className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Deskripsi</label>
          <input name="deskripsi" defaultValue={cpl.deskripsi} required className="border rounded px-2 py-1 w-full" />
        </div>
        <button type="submit" className="bg-black text-white rounded px-4 py-1.5">
          Simpan
        </button>
      </form>
    </div>
  );
}