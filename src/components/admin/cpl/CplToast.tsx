"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CplToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const berhasil = searchParams.get("berhasil");
  const diubah = searchParams.get("diubah");
  const pesan = berhasil
    ? `${berhasil} berhasil ditambahkan`
    : diubah
    ? `${diubah} berhasil diperbarui`
    : null;

  useEffect(() => {
    if (!pesan) return;
    const timer = setTimeout(() => router.replace("/admin/data-master/cpl"), 4000);
    return () => clearTimeout(timer);
  }, [pesan, router]);

  if (!pesan) return null;

  return (
    <div role="status" className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-medium text-white shadow-lg">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      {pesan}
    </div>
  );
}