import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";

export default async function DaftarMataKuliahInputNilaiPage() {
  const session = await auth();
  const dosenId = session!.user.dosenId!;

  const daftarMK = await prisma.mataKuliah.findMany({
    where: { penugasan: { some: { dosenId, tahunAjaran: { status: "AKTIF" } } } },
    orderBy: { kode: "asc" },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Input Nilai — Mata Kuliah Saya</h1>
      {daftarMK.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada mata kuliah yang ditugaskan kepada Anda di Tahun Ajaran aktif.</p>
      )}
      <ul className="space-y-2">
        {daftarMK.map((mk) => (
          <li key={mk.id}>
            <Link href={`/dosen/input-nilai/${mk.id}`} className="text-blue-600 hover:underline">
              {mk.kode} — {mk.nama}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}