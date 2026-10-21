"use client";

import Link from "next/link";
import { useState } from "react";
import { Ikon } from "../Ikon";
import { KARTU, KartuJudul, FOKUS } from "./KartuUI";
import type { StatusTugas, TugasRow } from "./tipe";

export type UrutTabel = "terbaru" | "bobot" | "kode" | "progres";
export const UKURAN_HALAMAN = 6;

const LABEL_URUT: Record<UrutTabel, string> = {
  terbaru: "Terbaru",
  bobot: "Bobot tertinggi",
  kode: "Kode tugas",
  progres: "Progres",
};

const STATUS: Record<StatusTugas, { label: string; ikon: "jamPasir" | "jam" | "centang"; warna: string; bar: string }> = {
  baru: { label: "Baru dibuat", ikon: "jamPasir", warna: "text-[#EA580C]", bar: "bg-[#EA580C]" },
  berjalan: { label: "Berjalan", ikon: "jamPasir", warna: "text-[#2563EB]", bar: "bg-[#2563EB]" },
  dinilai: { label: "Dinilai", ikon: "centang", warna: "text-[#16A34A]", bar: "bg-[#16A34A]" },
  belum: { label: "Belum", ikon: "jam", warna: "text-[#64748B]", bar: "bg-[#94A3B8]" },
};

const KOLOM = "grid grid-cols-[minmax(0,2.6fr)_64px_100px_minmax(0,1.6fr)_150px] items-center gap-3";

export function TabelTugas({
  baris,
  totalSemua,
  totalTersaring,
  halaman,
  onHalaman,
  urut,
  onUrut,
  sorotId,
  mataKuliahId,
  namaMK,
  onHapus,
  sedangHapus,
  readOnly = false,
}: {
  baris: TugasRow[];
  totalSemua: number;
  totalTersaring: number;
  halaman: number;
  onHalaman: (h: number) => void;
  urut: UrutTabel;
  onUrut: (u: UrutTabel) => void;
  sorotId: string | null;
  mataKuliahId: string;
  namaMK: string;
  onHapus: (t: TugasRow) => void;
  sedangHapus: boolean;
  readOnly?: boolean;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const jumlahHalaman = Math.max(1, Math.ceil(totalTersaring / UKURAN_HALAMAN));
  const awal = totalTersaring === 0 ? 0 : (halaman - 1) * UKURAN_HALAMAN + 1;
  const akhir = Math.min(halaman * UKURAN_HALAMAN, totalTersaring);

  return (
    <section className={`${KARTU} p-5`}>
      <KartuJudul
        judul="Daftar Tugas & Instrumen Penilaian"
        subjudul="Tugas terbaru ditampilkan di urutan pertama"
        aksi={
          <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#334155]">
            <span className="sr-only">Urutkan</span>
            <select
              value={urut}
              onChange={(e) => onUrut(e.target.value as UrutTabel)}
              className={`min-h-[32px] rounded-lg bg-transparent pr-1 text-[12px] font-semibold ${FOKUS}`}
            >
              {(Object.keys(LABEL_URUT) as UrutTabel[]).map((u) => (
                <option key={u} value={u}>
                  {LABEL_URUT[u]}
                </option>
              ))}
            </select>
            <Ikon nama="urut" ukuran={14} />
          </label>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th colSpan={5} scope="colgroup" className="p-0 font-normal">
                <div className={`${KOLOM} rounded-[10px] bg-[#F3F5F9] px-3 py-2 text-[11px] font-semibold uppercase tracking-[.04em] text-[#64748B]`}>
                  <span>Nama Instrumen / Tugas</span>
                  <span>Bobot</span>
                  <span>Pemetaan CPMK</span>
                  <span>Status Pengumpulan</span>
                  <span className="text-right">Aksi</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[13px] text-[#64748B]">
                  {totalSemua === 0
                    ? "Belum ada tugas. Klik “Buat Tugas Baru” untuk memulai."
                    : "Tidak ada tugas yang cocok. Hapus filter atau buat tugas baru."}
                </td>
              </tr>
            )}
            {baris.map((t) => {
              const st = STATUS[t.status];
              const sorot = t.id === sorotId;
              const persen = t.total ? Math.round((t.masuk / t.total) * 100) : 0;
              return (
                <tr key={t.id}>
                  <td colSpan={5} className="p-0">
                    <div
                      className={`${KOLOM} rounded-[10px] px-3 py-2.5 ${
                        sorot ? "border border-[#BFDBFE] bg-[#EFF6FF]" : "border border-transparent border-b-[#F1F5F9]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                            sorot ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#2563EB]"
                          }`}
                        >
                          {t.kode}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold" title={t.nama}>
                            {t.nama}
                          </p>
                          <p className="truncate text-[11px] text-[#64748B]">Pertemuan ke-{t.pertemuanKe}</p>
                        </div>
                        {sorot && <span className="text-[10px] font-bold text-[#EA580C]">BARU</span>}
                      </div>

                      <span>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-bold ${
                            sorot ? "bg-[#DBEAFE] text-[#1D4ED8]" : ""
                          }`}
                        >
                          {t.bobot}%
                        </span>
                      </span>

                      <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-[#2563EB]">
                          {t.cpmkAngka.length ? `CPMK ${t.cpmkAngka.join(", ")}` : "–"}
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          {t.subAngka.length ? `Sub ${t.subAngka.join(", ")}` : ""}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`flex items-center gap-1 font-semibold ${st.warna}`}>
                            <Ikon nama={st.ikon} ukuran={11} />
                            {st.label}
                          </span>
                          <span className="text-[#64748B]">
                            {t.masuk}/{t.total}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={t.total}
                          aria-valuenow={t.masuk}
                          aria-valuetext={`${t.masuk} dari ${t.total} mahasiswa`}
                          className="mt-1 h-1 overflow-hidden rounded-full bg-[#E5E7EB]"
                        >
                          <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${persen}%` }} />
                        </div>
                      </div>

                      <div className="relative flex items-center justify-end gap-1.5">
                        {t.status === "dinilai" ? (
                          <Link
                            href={`/dosen/hasil/${mataKuliahId}`}
                            className={`inline-flex min-h-[28px] items-center rounded-full bg-[#F3F5F9] px-3 text-[11px] font-bold text-[#334155] hover:bg-[#E5E7EB] ${FOKUS}`}
                          >
                            Lihat Rekap
                          </Link>
                        ) : (
                          <Link
                            href={`/dosen/input-nilai/${mataKuliahId}?tugas=${t.id}`}
                            className={`inline-flex min-h-[28px] items-center rounded-full px-3 text-[11px] font-bold ${FOKUS} ${
                              t.status === "berjalan"
                                ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                                : "bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]"
                            }`}
                          >
                            {t.status === "berjalan" ? "Input Nilai" : "Kelola"}
                          </Link>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            aria-label={`Menu aksi ${t.nama}`}
                            aria-expanded={menuId === t.id}
                            onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                            className={`grid h-8 w-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] ${FOKUS}`}
                          >
                            <Ikon nama="kebab" ukuran={16} />
                          </button>
                        )}
                        {!readOnly && menuId === t.id && (
                          <>
                            <button
                              type="button"
                              aria-label="Tutup menu"
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={() => setMenuId(null)}
                            />
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_8px_20px_rgba(15,23,42,.12)]">
                              <button
                                type="button"
                                disabled={sedangHapus}
                                onClick={() => {
                                  setMenuId(null);
                                  onHapus(t);
                                }}
                                className={`flex min-h-[34px] w-full items-center gap-2 rounded-lg px-2.5 text-[12px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-60 ${FOKUS}`}
                              >
                                <Ikon nama="hapus" ukuran={14} />
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
        <span>
          Total {totalSemua} instrumen penilaian aktif untuk kelas {namaMK}
        </span>
        <span className="flex items-center gap-2">
          Menampilkan {awal}–{akhir} dari {totalTersaring}
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={halaman <= 1}
            onClick={() => onHalaman(halaman - 1)}
            className={`grid h-8 w-8 rotate-180 place-items-center rounded-full border border-[#E5E7EB] disabled:opacity-40 ${FOKUS}`}
          >
            <Ikon nama="chevronKanan" ukuran={14} />
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={halaman >= jumlahHalaman}
            onClick={() => onHalaman(halaman + 1)}
            className={`grid h-8 w-8 place-items-center rounded-full border border-[#E5E7EB] disabled:opacity-40 ${FOKUS}`}
          >
            <Ikon nama="chevronKanan" ukuran={14} />
          </button>
        </span>
      </footer>
    </section>
  );
}
