import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashRahasia } from "@/lib/keamanan";
import { ResetSandiForm } from "@/components/ResetSandiForm";

export const dynamic = "force-dynamic";

async function tokenMasihBerlaku(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const user = await prisma.user.findUnique({
    where: { resetToken: hashRahasia(token) },
    select: { resetTokenExpiresAt: true },
  });
  return !!user?.resetTokenExpiresAt && user.resetTokenExpiresAt >= new Date();
}

export const metadata: Metadata = { title: "Atur Kata Sandi Baru" };

export default async function ResetSandiTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const berlaku = await tokenMasihBerlaku(token);

  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-100 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {berlaku ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Atur Kata Sandi Baru</h1>
            <p className="mb-6 text-sm text-slate-500">
              Buat kata sandi baru untuk akun Anda. Tautan ini hanya bisa dipakai satu kali.
            </p>
            <ResetSandiForm token={token} />
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Tautan Tidak Berlaku</h1>
            <p className="mb-6 text-sm leading-6 text-slate-500">
              Tautan reset ini sudah dipakai, kedaluwarsa, atau tidak dikenali. Ajukan permintaan baru lewat
              halaman lupa kata sandi, lalu minta Admin Program Studi membuatkan tautan yang baru.
            </p>
            <Link
              href="/lupa-sandi"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
            >
              Ajukan Permintaan Baru
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
