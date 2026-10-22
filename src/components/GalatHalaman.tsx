"use client";

import Link from "next/link";
import { useEffect } from "react";

// Tampilan untuk error.tsx di area admin dan dosen. Pesan teknis tidak ditampilkan ke pengguna;
// kode referensi (digest) cukup untuk dicocokkan dengan log server.
export function GalatHalaman({
  error,
  reset,
  berandaHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  berandaHref: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center p-4">
      <div role="alert" className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3C7] text-[#92400E]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3L2 20h20L12 3Z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-[#111827]">Halaman tidak bisa dimuat</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          Terjadi kendala saat mengambil data. Data Anda aman. Coba muat ulang; jika masih berulang, hubungi
          admin program studi.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-[#9AA4B2]">
            Kode referensi: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={berandaHref}
            className="flex h-11 items-center justify-center rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
          >
            Ke beranda
          </Link>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
