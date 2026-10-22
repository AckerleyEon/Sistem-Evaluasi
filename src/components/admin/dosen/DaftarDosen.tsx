"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { namaDenganGelar } from "@/lib/dosen";
import type { DosenItem } from "./DosenWorkspace";

function buatHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/dosen${qs ? `?${qs}` : ""}`;
}

function daftarHalaman(sekarang: number, total: number): (number | "…")[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const angka = [...new Set([1, total, sekarang - 1, sekarang, sekarang + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const hasil: (number | "…")[] = [];
  angka.forEach((n, i) => {
    if (i > 0 && n - angka[i - 1] > 1) hasil.push("…");
    hasil.push(n);
  });
  return hasil;
}

export function DaftarDosen({
  daftar,
  total,
  q,
  page,
  totalHalaman,
  totalHasil,
  pageSize,
  onEdit,
  onHapus,
  onGantiSandi,
}: {
  daftar: DosenItem[];
  total: number;
  q: string;
  page: number;
  totalHalaman: number;
  totalHasil: number;
  pageSize: number;
  onEdit: (d: DosenItem) => void;
  onHapus: (d: DosenItem) => void;
  onGantiSandi: (d: DosenItem) => void;
}) {
  const router = useRouter();
  const [cari, setCari] = useState(q);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function ubahCari(nilai: string) {
    setCari(nilai);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(() => router.replace(buatHref(nilai.trim(), 1), { scroll: false }));
    }, 300);
  }

  const dari = totalHasil === 0 ? 0 : (page - 1) * pageSize + 1;
  const sampai = Math.min(page * pageSize, totalHasil);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="border-b border-[#E8EAEE] p-5">
        <div className="relative w-full max-w-105">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={cari}
            onChange={(e) => ubahCari(e.target.value)}
            placeholder="Cari dosen, NIP, atau mata kuliah..."
            className="h-11 w-full rounded-[10px] bg-[#EEF3FD] pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
          />
        </div>
      </div>

      {total === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-[#6B7280]">Belum ada akun dosen untuk ditampilkan.</div>
      ) : totalHasil === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
          Tidak ada dosen yang cocok dengan kata kunci pencarian.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse">
            <caption className="sr-only">Daftar akun dosen</caption>
            <thead>
              <tr className="border-b border-[#E8EAEE] text-left text-xs font-semibold uppercase tracking-[.06em] text-[#6B7280]">
                <th scope="col" className="w-16 px-6 py-3">No</th>
                <th scope="col" className="px-2 py-3">Dosen</th>
                <th scope="col" className="w-44 px-2 py-3">Sandi</th>
                <th scope="col" className="w-32 px-6 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
              {daftar.map((d, i) => (
                <tr key={d.id} className="border-b border-[#E8EAEE] last:border-0">
                  <td className="px-6 py-4 align-top text-sm font-semibold text-[#111827]">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="min-w-0 px-2 py-4">
                    <p className="text-sm font-semibold text-[#111827]" style={{ overflowWrap: "anywhere" }}>
                      {namaDenganGelar(d)}
                    </p>
                    <p className="text-xs text-[#6B7280]">NIP. {d.nip}</p>
                    {d.alias && <p className="text-xs text-[#2F6BE8]">Alias Excel: {d.alias}</p>}
                  </td>
                  <td className="px-2 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="sr-only">Kata sandi disembunyikan</span>
                      <button
                        onClick={() => onGantiSandi(d)}
                        aria-label={`Ganti kata sandi ${d.nama}`}
                        className="min-h-8 rounded-lg bg-[#EEF3FD] px-2.5 text-xs font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
                      >
                        Ganti
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3 align-top">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onEdit(d)}
                        aria-label={`Edit ${d.nama}`}
                        className="min-h-9 rounded-lg bg-[#EEF3FD] px-3 text-xs font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onHapus(d)}
                        aria-label={`Hapus ${d.nama}`}
                        title={`Hapus ${d.nama}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] [@media(hover:hover)]:hover:bg-[#FEE2E2] [@media(hover:hover)]:hover:text-[#DC2626]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#E8EAEE] px-6 py-4 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {dari}–{sampai} dari {totalHasil} Dosen
          {q && ` untuk "${q}"`}
        </span>

        {totalHalaman > 1 && (
          <nav aria-label="Halaman" className="flex items-center gap-1.5">
            {page > 1 ? (
              <Link href={buatHref(q, page - 1)} scroll={false} aria-label="Halaman sebelumnya" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]">
                ‹
              </Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center text-[#C4C9D2]">‹</span>
            )}

            {daftarHalaman(page, totalHalaman).map((n, i) =>
              n === "…" ? (
                <span key={`titik-${i}`} className="px-1">…</span>
              ) : (
                <Link
                  key={n}
                  href={buatHref(q, n)}
                  scroll={false}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                    n === page
                      ? "bg-[#2F6BE8] text-white"
                      : "bg-white text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
                  }`}
                >
                  {n}
                </Link>
              )
            )}

            {page < totalHalaman ? (
              <Link href={buatHref(q, page + 1)} scroll={false} aria-label="Halaman berikutnya" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]">
                ›
              </Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center text-[#C4C9D2]">›</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}