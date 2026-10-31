"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Ikon } from "../Ikon";
import { finalisasiDistribusi } from "@/lib/actions/distribusi";
import { statusDistribusi } from "@/lib/asesmen-tampilan";
import { FOKUS, KARTU } from "./KartuUI";
import type { DataAsesmen } from "./tipe";

function Tile({ ikon }: { ikon: "users" | "hierarki" | "clipboard" }) {
  return (
    <span className="grid h-5 w-7 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
      <Ikon nama={ikon} ukuran={15} />
    </span>
  );
}

function TombolDistribusikan({
  aktif,
  alasan,
  onBukaKonfirmasi,
  onTerkirim,
}: {
  aktif: boolean;
  alasan: string | null;
  onBukaKonfirmasi: () => void;
  onTerkirim: () => void;
}) {
  const { pending } = useFormStatus();
  const mati = !aktif || pending;

  useEffect(() => {
    if (pending) onTerkirim();
  }, [pending, onTerkirim]);

  return (
    <>
      <button
        type="button"
        disabled={mati}
        title={alasan ?? undefined}
        onClick={onBukaKonfirmasi}
        className={`flex min-h-8.5 items-center gap-2 rounded-full px-6 text-[11px] font-bold text-white ${FOKUS} ${
          mati ? "cursor-not-allowed bg-[#BFDBFE]" : "bg-[#2563EB] shadow-[0_6px_14px_rgba(37,99,235,.30)] hover:bg-[#1D4ED8]"
        }`}
      >
        <Ikon nama="hierarki" ukuran={13} />
        {pending ? "Mendistribusikan..." : "Distribusikan"}
      </button>
    </>
  );
}

export function BarisKonteks({
  data,
}: {
  data: DataAsesmen;
}) {
  const router = useRouter();
  const dialogDistribusi = useRef<HTMLDialogElement>(null);
  const [konfirmasiDistribusi, setKonfirmasiDistribusi] = useState(false);
  const tutupKonfirmasiDistribusi = useCallback(() => setKonfirmasiDistribusi(false), []);
  const aktif = data.tahunAjaran.status === "AKTIF";
  const { terpetakan, total } = data.distribusiSub;
  const dist = statusDistribusi(terpetakan, total, {
    adaTugas: data.tugas.length > 0,
    bolehKelola: data.koordinator,
    arsip: !aktif,
  });
  const warnaAngka = total === 0 ? "text-[#64748B]" : dist.lengkap ? "text-[#16A34A]" : "text-[#EA580C]";

  useEffect(() => {
    const dialog = dialogDistribusi.current;
    if (!dialog || !konfirmasiDistribusi) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [konfirmasiDistribusi]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 lg:grid-cols-11">
      {/* Kartu mata kuliah */}
      <div className="relative flex min-h-20 flex-col rounded-2xl bg-[#2563EB] p-4 text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#60A5FA] sm:col-span-6 lg:col-span-5">
        <div className="relative z-0 flex items-center gap-2 text-[12px]">
          <span className="rounded-md bg-white/20 px-2 py-0.5 font-bold">{data.mataKuliah.kode}</span>
          <span>{data.mataKuliah.sks} SKS</span>
          <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 font-bold">{data.mahasiswaTotal} Mhs</span>
        </div>
        <div className="relative z-10 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[18px] font-bold leading-snug">{data.mataKuliah.nama}</p>
            {data.dosenNama && <p className="mt-1 truncate text-[12px] text-white/85">{data.dosenNama}</p>}
          </div>
          {data.daftarKelas.length > 0 && (
            <label className="relative z-10 ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 text-[11px] font-semibold text-[#2563EB]">
              <span>Kelas {data.kelas.nama}</span>
              <span className="rounded-full bg-[#EFF6FF] px-1.5 py-0.5">{data.mahasiswa} Mhs</span>
              <Ikon nama="chevronBawah" ukuran={12} />
              <select
                aria-label="Pilih kelas"
                value={data.kelas.id}
                onChange={(e) => {
                  const suffix = `?kelas=${encodeURIComponent(e.target.value)}`;
                  router.push(`/dosen/komponen-penilaian/${data.mataKuliah.id}${suffix}`);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&>option]:text-[#0F172A]"
              >
                {data.daftarKelas.map((kelas) => (
                  <option key={kelas.id} value={kelas.id}>
                    Kelas {kelas.nama}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <Ikon nama="chevronBawah" ukuran={20} className="relative z-0 mx-auto mt-1 block text-white/90" />
        <select
          aria-label="Pilih mata kuliah"
          value={data.mataKuliah.id}
          onChange={(e) => router.push(`/dosen/komponen-penilaian/${e.target.value}`)}
          className="absolute inset-0 z-1 h-full w-full cursor-pointer rounded-2xl opacity-0 [&>option]:text-[#0F172A]"
        >
          {data.daftarMK.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Distribusi Sub-CPMK */}
      <form
        action={finalisasiDistribusi}
        className={`${KARTU} flex min-h-20 flex-col justify-between p-5 sm:col-span-3 lg:col-span-3`}
      >
        <input type="hidden" name="mataKuliahId" value={data.mataKuliah.id} />
        <input type="hidden" name="kelasId" value={data.kelas.id} />
        <div className="flex items-start justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">Distribusi Sub-CPMK</span>
          <Tile ikon="hierarki" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className={`text-[30px] font-bold leading-none ${warnaAngka}`}>
              {terpetakan}/{total}
            </span>
            <span className="text-[14px] text-[#64748B]">Sub</span>
          </p>
          <TombolDistribusikan
            aktif={dist.tombolAktif}
            alasan={dist.alasanNonaktif}
            onBukaKonfirmasi={() => setKonfirmasiDistribusi(true)}
            onTerkirim={tutupKonfirmasiDistribusi}
          />
        </div>
        {konfirmasiDistribusi && (
          <dialog
            ref={dialogDistribusi}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="judul-konfirmasi-distribusi"
            aria-describedby="deskripsi-konfirmasi-distribusi"
            onCancel={(event) => {
              event.preventDefault();
              setKonfirmasiDistribusi(false);
            }}
            onClick={(event) => {
              if (event.target === dialogDistribusi.current) setKonfirmasiDistribusi(false);
            }}
            className="m-auto w-[min(92vw,30rem)] rounded-2xl bg-white p-0 text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,.25)] backdrop:bg-[rgba(15,23,42,.45)]"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Ikon nama="hierarki" ukuran={18} />
                </span>
                <div>
                  <h2 id="judul-konfirmasi-distribusi" className="text-[15px] font-bold">
                    Distribusikan Sub-CPMK?
                  </h2>
                  <p id="deskripsi-konfirmasi-distribusi" className="mt-1 text-[12px] leading-relaxed text-[#475569]">
                    Bagikan {total - terpetakan} Sub-CPMK yang belum terhubung secara merata (round-robin) ke tugas di kelas {data.kelas.nama}. Pemetaan manual tidak diubah.
                  </p>
                </div>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
              <button
                type="button"
                onClick={() => setKonfirmasiDistribusi(false)}
                className={`min-h-9 rounded-lg border border-[#E5E7EB] px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] ${FOKUS}`}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`min-h-9 rounded-lg bg-[#2563EB] px-4 text-[12px] font-semibold text-white hover:bg-[#1D4ED8] ${FOKUS}`}
              >
                Distribusikan
              </button>
            </footer>
          </dialog>
        )}
      </form>

      {/* Total tugas pada lingkup kelas yang dipilih */}
      <div className={`${KARTU} flex min-h-20 flex-col justify-between p-5 sm:col-span-3 lg:col-span-3`}>
        <div className="flex items-start justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">Total Tugas</span>
          <Tile ikon="clipboard" />
        </div>
        <div className="flex items-end justify-between">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[30px] font-bold leading-none">{data.tugas.length}</span>
            <span className="text-[14px] text-[#64748B]">Tugas</span>
          </p>
          <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">Total</span>
        </div>
      </div>
    </div>
  );
}
