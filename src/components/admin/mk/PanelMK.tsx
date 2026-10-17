"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MkItem, MhsItem } from "./tipe";
import { ManajemenKelas } from "./ManajemenKelas";
import type { DosenOpsi } from "./tipe";

function buatHref(mk: string, q: string, page: number, kelasId: string | null) {
  const params = new URLSearchParams();
  params.set("mk", mk);
  if (kelasId) params.set("kelas", kelasId);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return `/admin/data-master/mata-kuliah?${params.toString()}`;
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

const kelasIkon =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2F6BE8] [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10";

export function PanelMK({
  mk,
  taLabel,
  mahasiswa,
  dosen,
  kelasId,
  q,
  page,
  totalHalaman,
  totalHasil,
  pageSize,
  onTambahMhs,
  onImporMhs,
  onEditMhs,
  onHapusKelas,
  onPindah,
  onUbahKelas,
}: {
  mk: MkItem;
  taLabel: string;
  mahasiswa: MhsItem[];
  dosen: DosenOpsi[];
  kelasId: string | null;
  q: string;
  page: number;
  totalHalaman: number;
  totalHasil: number;
  pageSize: number;
  onTambahMhs: () => void;
  onImporMhs: () => void;
  onEditMhs: (m: MhsItem) => void;
  onHapusKelas: (m: MhsItem) => void;
  onPindah: (m: MhsItem) => void;
  onUbahKelas: (m: MhsItem, kelasId: string) => void;
}) {
  const router = useRouter();
  const [cari, setCari] = useState(q);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function ubahCari(nilai: string) {
    setCari(nilai);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(() => router.replace(buatHref(mk.id, nilai.trim(), 1, kelasId), { scroll: false }));
    }, 300);
  }

  const dari = totalHasil === 0 ? 0 : (page - 1) * pageSize + 1;
  const sampai = Math.min(page * pageSize, totalHasil);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-[#EEF3FD] px-1.5 py-0.5 font-semibold text-[#2F6BE8]">{mk.kode}</span>
            <span className="text-[#6B7280]">{mk.sks} SKS</span>
          </div>
          <h2 className="text-xl font-bold text-[#111827]" style={{ overflowWrap: "anywhere" }}>{mk.nama}</h2>
          <p className="mt-1 text-xs text-[#6B7280]">Koordinator MK (PJMK): {mk.pjmkNama ?? "tanpa pengampu"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onTambahMhs} className="h-9 rounded-lg border border-[#2F6BE8] bg-white px-3 text-xs font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#EEF3FD]">
            Tambah Mahasiswa
          </button>
          <button onClick={onImporMhs} className="h-9 rounded-lg bg-[#2F6BE8] px-3 text-xs font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]">
            Isi Mahasiswa via Excel
          </button>
        </div>
      </div>

      <div className="my-5 border-t border-[#E8EAEE]" />

      <ManajemenKelas mk={mk} kelas={mk.kelas} dosen={dosen} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111827]">Mahasiswa per Kelas</h3>
          <p className="text-xs text-[#6B7280]">{totalHasil} mahasiswa pada pilihan kelas · T.A. {taLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
        <select
          value={kelasId ?? ""}
          onChange={(e) => router.replace(buatHref(mk.id, q, 1, e.target.value || null), { scroll: false })}
          aria-label="Pilih kelas mahasiswa"
          className="h-10 rounded-[10px] bg-[#EEF3FD] px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
        >
          <option value="">Belum ditentukan ({mk.jumlahMhs - mk.kelas.reduce((total, k) => total + k.jumlahMhs, 0)})</option>
          {mk.kelas.map((kelas) => (
            <option key={kelas.id} value={kelas.id}>{kelas.nama} · {kelas.jumlahMhs} mhs · {kelas.dosenNama ?? "tanpa pengampu"}</option>
          ))}
        </select>
        <div className="relative w-full sm:max-w-65">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={cari}
            onChange={(e) => ubahCari(e.target.value)}
            placeholder="Cari NIM atau nama mahasiswa..."
            className="h-10 w-full rounded-[10px] bg-[#EEF3FD] pl-10 pr-3 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none focus:ring-2 focus:ring-[#2F6BE8]/30"
          />
        </div>
        </div>
      </div>

      {totalHasil === 0 ? (
        <div className="rounded-xl bg-[#F8FAFF] px-6 py-10 text-center text-sm text-[#6B7280]">
          {q ? (
            "Tidak ada mahasiswa yang cocok dengan kata kunci pencarian."
          ) : (
            <>
              <p className="mb-3">Belum ada mahasiswa terdaftar di kelas ini.</p>
              <button onClick={onTambahMhs} className="h-9 rounded-lg bg-[#2F6BE8] px-4 text-xs font-semibold text-white">
                Tambah Mahasiswa
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-130 border-collapse">
            <caption className="sr-only">Mahasiswa terdaftar di {mk.kode}</caption>
            <thead>
              <tr className="bg-[#F8FAFF] text-left text-xs font-semibold uppercase tracking-[.06em] text-[#6B7280]">
                <th scope="col" className="w-14 px-4 py-3">No</th>
                <th scope="col" className="px-2 py-3">Nama Mahasiswa</th>
                <th scope="col" className="w-36 px-2 py-3">NIM</th>
                <th scope="col" className="w-36 px-2 py-3">Kelas</th>
                <th scope="col" className="w-36 px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
              {mahasiswa.map((m, i) => (
                <tr key={m.id} className="border-b border-[#F1F3F5] last:border-0">
                  <td className="px-4 py-3 text-sm text-[#111827]">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-2 py-3 text-sm font-semibold text-[#111827]" style={{ overflowWrap: "anywhere" }}>{m.nama}</td>
                  <td className="px-2 py-3 text-sm tabular-nums text-[#4B5563]">{m.nim}</td>
                  <td className="px-2 py-2">
                    <select
                      value={m.kelasId ?? ""}
                      onChange={(e) => onUbahKelas(m, e.target.value)}
                      aria-label={`Kelas ${m.nama}`}
                      className="h-9 max-w-36 rounded-lg bg-[#EEF3FD] px-2 text-xs text-[#111827] outline-none"
                    >
                      <option value="">Belum ditentukan</option>
                      {mk.kelas.map((kelas) => (
                        <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onPindah(m)} aria-label={`Pindah kelas ${m.nama}`} title="Pindah kelas" className={`${kelasIkon} [@media(hover:hover)]:hover:bg-[#EFF6FF] [@media(hover:hover)]:hover:text-[#2563EB]`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17 4l3 3-3 3" />
                          <path d="M20 7H8" />
                          <path d="M7 20l-3-3 3-3" />
                          <path d="M4 17h12" />
                        </svg>
                      </button>
                      <button onClick={() => onEditMhs(m)} aria-label={`Edit mahasiswa ${m.nama}`} title="Edit data mahasiswa" className={`${kelasIkon} [@media(hover:hover)]:hover:bg-[#EFF6FF] [@media(hover:hover)]:hover:text-[#2563EB]`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button onClick={() => onHapusKelas(m)} aria-label={`Hapus ${m.nama} dari kelas`} title="Hapus dari kelas" className={`${kelasIkon} [@media(hover:hover)]:hover:bg-[#FEF2F2] [@media(hover:hover)]:hover:text-[#DC2626]`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      <div className="mt-4 flex flex-col gap-3 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {dari}–{sampai} dari {totalHasil} Mahasiswa
        </span>
        {totalHalaman > 1 && (
          <nav aria-label="Halaman" className="flex items-center gap-1.5">
            {page > 1 ? (
              <Link href={buatHref(mk.id, q, page - 1, kelasId)} scroll={false} aria-label="Halaman sebelumnya" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]">‹</Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center text-[#C4C9D2]">‹</span>
            )}
            {daftarHalaman(page, totalHalaman).map((n, i) =>
              n === "…" ? (
                <span key={`titik-${i}`} className="px-1">…</span>
              ) : (
                <Link
                  key={n}
                  href={buatHref(mk.id, q, n, kelasId)}
                  scroll={false}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                    n === page ? "bg-[#2F6BE8] text-white" : "bg-white text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
                  }`}
                >
                  {n}
                </Link>
              )
            )}
            {page < totalHalaman ? (
              <Link href={buatHref(mk.id, q, page + 1, kelasId)} scroll={false} aria-label="Halaman berikutnya" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]">›</Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center text-[#C4C9D2]">›</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}