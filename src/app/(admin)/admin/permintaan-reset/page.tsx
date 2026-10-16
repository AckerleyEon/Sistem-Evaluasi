import { prisma } from "@/lib/prisma";
import { TombolBuatTautan } from "@/components/TombolBuatTautan";

export default async function PermintaanResetPage() {
  const daftar = await prisma.permintaanResetSandi.findMany({
    where: { status: "MENUNGGU" },
    include: { user: { include: { dosen: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Permintaan Reset Kata Sandi (Dosen)</h1>
      {daftar.length === 0 ? (
        <p className="text-sm text-gray-500">Tidak ada permintaan yang menunggu.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Dosen</th>
              <th className="py-2">Diminta pada</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.user.dosen?.nama ?? p.user.username}</td>
                <td className="py-2">{p.createdAt.toLocaleString("id-ID")}</td>
                <td className="py-2">
                  <TombolBuatTautan permintaanId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}