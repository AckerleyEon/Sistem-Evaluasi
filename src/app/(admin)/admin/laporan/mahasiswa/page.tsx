import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function LaporanMahasiswaListPage({
  searchParams,
}: {
  searchParams: Promise<{ angkatan?: string }>;
}) {
  const { angkatan } = await searchParams;

  const daftarMahasiswa = await prisma.mahasiswa.findMany({
    where: angkatan ? { angkatan: Number(angkatan) } : undefined,
    orderBy: { nim: "asc" },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">
        Rincian Per Mahasiswa {angkatan ? `— Angkatan ${angkatan}` : ""}
      </h1>
      <ul className="space-y-2">
        {daftarMahasiswa.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/laporan/mahasiswa/${m.id}`} className="text-blue-600 hover:underline">
              {m.nim} — {m.nama}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}