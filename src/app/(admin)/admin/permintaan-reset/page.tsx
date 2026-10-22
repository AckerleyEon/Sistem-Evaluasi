import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TombolBuatTautan } from "@/components/TombolBuatTautan";

export const metadata: Metadata = { title: "Permintaan Reset Kata Sandi" };

// Server cloud biasanya berzona UTC, jadi zona waktu ditetapkan eksplisit ke WIB.
const formatWaktu = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function PermintaanResetPage() {
  const daftar = await prisma.permintaanResetSandi.findMany({
    where: { status: "MENUNGGU" },
    include: { user: { include: { dosen: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold leading-6.5 text-[#111827]">Permintaan Reset Kata Sandi</h1>
          <p className="text-[13px] text-[#6B7280]">
            Dosen yang lupa kata sandi. Buatkan tautan reset, lalu kirim langsung kepada dosen yang bersangkutan.
          </p>
        </div>
        <Link
          href="/admin/dosen"
          className="flex h-11 items-center justify-center rounded-[10px] bg-[#EEF3FD] px-5 text-sm font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
        >
          Kelola Akun Dosen
        </Link>
      </div>

      <div className="rounded-2xl bg-[#EEF3FD] px-5 py-3 text-[13px] leading-5 text-[#4B5563]">
        Tautan berlaku 60 menit dan hanya bisa dipakai satu kali. Setelah dibuat, permintaan dianggap selesai
        dan tautannya tidak akan ditampilkan lagi, jadi salin dan kirim sebelum meninggalkan halaman ini.
      </div>

      <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        {daftar.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#111827]">Tidak ada permintaan yang menunggu</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Permintaan baru dari dosen akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F0] text-left text-xs font-semibold uppercase tracking-[.04em] text-[#6B7280]">
                  <th scope="col" className="px-6 py-3">Dosen</th>
                  <th scope="col" className="px-6 py-3">Diminta pada</th>
                  <th scope="col" className="px-6 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id} className="border-b border-[#EEF1F7] last:border-0 align-top">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#111827]">{p.user.dosen?.nama ?? p.user.username}</div>
                      <div className="text-xs text-[#6B7280]">Username: {p.user.username}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[#4B5563]">{formatWaktu.format(p.createdAt)} WIB</td>
                    <td className="px-6 py-4">
                      <TombolBuatTautan permintaanId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
