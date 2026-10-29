"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Ikon } from "../Ikon";
import { finalisasiDistribusi } from "@/lib/actions/distribusi";
import { statusDistribusi } from "@/lib/asesmen-tampilan";
import { FOKUS, KARTU } from "./KartuUI";
import type { DataAsesmen } from "./tipe";

function Tile({ ikon }: { ikon: "users" | "hierarki" }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
      <Ikon nama={ikon} ukuran={15} />
    </span>
  );
}

function TombolDistribusikan({ aktif, alasan }: { aktif: boolean; alasan: string | null }) {
  const { pending } = useFormStatus();
  const mati = !aktif || pending;
  return (
    <button
      type="submit"
      aria-disabled={mati}
      title={alasan ?? undefined}
      onClick={(e) => {
        if (mati) e.preventDefault();
      }}
      className={`flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-white ${FOKUS} ${
        mati ? "cursor-not-allowed bg-[#BFDBFE]" : "bg-[#2563EB] shadow-[0_6px_14px_rgba(37,99,235,.30)] hover:bg-[#1D4ED8]"
      }`}
    >
      <Ikon nama="hierarki" ukuran={13} />
      {pending ? "Mendistribusikan..." : "Distribusikan"}
    </button>
  );
}

export function BarisKonteks({
  data,
  onBuatTugas,
  tombolBuatRef,
}: {
  data: DataAsesmen;
  onBuatTugas: () => void;
  tombolBuatRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const router = useRouter();
  const aktif = data.tahunAjaran.status === "AKTIF";
  const { terpetakan, total } = data.distribusiSub;
  const dist = statusDistribusi(terpetakan, total, {
    adaTugas: data.tugas.length > 0,
    bolehKelola: data.koordinator,
    arsip: !aktif,
  });
  const warnaAngka = total === 0 ? "text-[#64748B]" : dist.lengkap ? "text-[#16A34A]" : "text-[#EA580C]";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
      {/* Kartu mata kuliah */}
      <div className="relative min-h-[112px] rounded-2xl bg-[#2563EB] p-4 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#60A5FA] sm:col-span-6 lg:col-span-4">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-md bg-white/20 px-2 py-0.5 font-bold">{data.mataKuliah.kode}</span>
          <span>{data.mataKuliah.sks} SKS</span>
          <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 font-bold">{data.mahasiswa} Mhs</span>
        </div>
        <p className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug">{data.mataKuliah.nama}</p>
        {data.dosenNama && <p className="mt-1 truncate text-[11px] text-white/85">{data.dosenNama}</p>}
        <Ikon nama="chevronBawah" ukuran={16} className="mx-auto mt-1 block text-white/90" />
        <select
          aria-label="Pilih mata kuliah"
          value={data.mataKuliah.id}
          onChange={(e) => router.push(`/dosen/komponen-penilaian/${e.target.value}`)}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl opacity-0 [&>option]:text-[#0F172A]"
        >
          {data.daftarMK.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Kelas + Buat Tugas */}
      <div className="flex flex-col justify-center gap-2 sm:col-span-3 lg:col-span-2">
        {data.daftarKelas.length > 0 && (
          <label className="relative block">
            <span className="sr-only">Pilih kelas</span>
            <select
              value={data.kelas?.id ?? ""}
              onChange={(e) => {
                const suffix = e.target.value ? `?kelas=${encodeURIComponent(e.target.value)}` : "";
                router.push(`/dosen/komponen-penilaian/${data.mataKuliah.id}${suffix}`);
              }}
              className={`min-h-[40px] w-full cursor-pointer appearance-none rounded-[10px] bg-[#2563EB] pl-3 pr-8 text-[12px] font-bold text-white [&>option]:text-[#0F172A] ${FOKUS}`}
            >
              {data.daftarKelas.map((kelas) => (
                <option key={kelas.id} value={kelas.id}>
                  Kelas {kelas.nama}
                </option>
              ))}
            </select>
            <Ikon nama="chevronBawah" ukuran={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white" />
          </label>
        )}
        {aktif && (
          <button
            ref={tombolBuatRef}
            type="button"
            onClick={onBuatTugas}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-[10px] bg-[#2563EB] px-3 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] transition hover:bg-[#1D4ED8] ${FOKUS}`}
          >
            <Ikon nama="plus" ukuran={14} />
            Buat Tugas Baru
          </button>
        )}
      </div>

      {/* Mahasiswa terdaftar */}
      <div className={`${KARTU} flex min-h-[96px] flex-col justify-between p-4 sm:col-span-3 lg:col-span-3`}>
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Mahasiswa Terdaftar</span>
          <Tile ikon="users" />
        </div>
        <div className="flex items-end justify-between">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold leading-none">{data.mahasiswa}</span>
            <span className="text-[12px] text-[#64748B]">Mahasiswa</span>
          </p>
          <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">Total</span>
        </div>
      </div>

      {/* Distribusi Sub-CPMK */}
      <form
        action={finalisasiDistribusi}
        onSubmit={(e) => {
          if (!dist.tombolAktif) return;
          const sisa = total - terpetakan;
          const ok = window.confirm(
            `Bagikan ${sisa} Sub-CPMK yang belum terhubung ke tugas secara merata (round-robin)? Pemetaan manual tidak diubah.`,
          );
          if (!ok) e.preventDefault();
        }}
        className={`${KARTU} flex min-h-[96px] flex-col justify-between p-4 sm:col-span-6 lg:col-span-3`}
      >
        <input type="hidden" name="mataKuliahId" value={data.mataKuliah.id} />
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Distribusi Sub-CPMK</span>
          <Tile ikon="hierarki" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className={`text-[28px] font-bold leading-none ${warnaAngka}`}>
              {terpetakan}/{total}
            </span>
            <span className="text-[12px] text-[#64748B]">Sub</span>
          </p>
          <TombolDistribusikan aktif={dist.tombolAktif} alasan={dist.alasanNonaktif} />
        </div>
      </form>
    </div>
  );
}
