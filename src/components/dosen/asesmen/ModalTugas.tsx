"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Ikon } from "../Ikon";
import { buatTugas } from "@/lib/actions/asesmen";
import { bagiProporsional } from "@/lib/asesmen-util";
import { FOKUS } from "./KartuUI";
import { WARNA_BOBOT } from "./DistribusiBobot";
import type { DataAsesmen, RingkasanBuat } from "./tipe";

function inisial(nama: string) {
  const k = nama.split(/\s+/).filter(Boolean);
  return ((k[0]?.[0] ?? "") + (k[1]?.[0] ?? "")).toUpperCase();
}

export function ModalTugas({
  data,
  onTutup,
  onSukses,
}: {
  data: DataAsesmen;
  onTutup: () => void;
  onSukses: (r: RingkasanBuat) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, mulai] = useTransition();
  const tugasLingkup = useMemo(
    () => data.tugas.filter((t) => t.kelasId === (data.kelas?.id ?? null)),
    [data.tugas, data.kelas?.id],
  );
  const [judul, setJudul] = useState("");
  const [pertemuan, setPertemuan] = useState(data.pertemuanDefault);
  const [bobot, setBobot] = useState(tugasLingkup.length === 0 ? 100 : 20);
  const [subDipilih, setSubDipilih] = useState<Set<string>>(new Set());
  const [sentuh, setSentuh] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const adaTugas = tugasLingkup.length > 0;
  const kodeBaru = `T${tugasLingkup.length + 1}`;
  const totalSekarang = Math.round(tugasLingkup.reduce((s, t) => s + t.bobot, 0) * 10) / 10;
  const kotor = judul.trim() !== "" || subDipilih.size > 0;
  const judulKosong = judul.trim() === "";
  const bisaSimpan = !judulKosong && bobot > 0 && subDipilih.size > 0 && !pending;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const bobotLain = useMemo(
    () => bagiProporsional(tugasLingkup.map((t) => t.bobot), 100 - bobot),
    [tugasLingkup, bobot],
  );

  const cplTarget = useMemo(() => {
    const kode = new Set<string>();
    for (const c of data.cpmk) {
      if (c.sub.some((s) => subDipilih.has(s.id))) c.cpl.forEach((l) => kode.add(l.kode));
    }
    return [...kode];
  }, [data.cpmk, subDipilih]);

  function tutup() {
    if (kotor && !window.confirm("Perubahan belum disimpan. Tutup formulir?")) return;
    dialog.current?.close();
    onTutup();
  }

  function toggleSub(id: string) {
    setSubDipilih((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleCpmk(idx: number) {
    const c = data.cpmk[idx];
    setSubDipilih((s) => {
      const n = new Set(s);
      const semua = c.sub.length > 0 && c.sub.every((x) => n.has(x.id));
      c.sub.forEach((x) => (semua ? n.delete(x.id) : n.add(x.id)));
      return n;
    });
  }

  function simpan() {
    if (!bisaSimpan) return;
    setGalat(null);
    mulai(async () => {
      const hasil = await buatTugas({
        mataKuliahId: data.mataKuliah.id,
        nama: judul,
        pertemuanKe: pertemuan,
        bobot,
        subCpmkIds: [...subDipilih],
        kelasId: data.kelas?.id,
      });
      if (!hasil.ok || !hasil.ringkasan) {
        setGalat(hasil.pesan);
        return;
      }
      dialog.current?.close();
      onSukses(hasil.ringkasan);
    });
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="judul-modal-tugas"
      onCancel={(e) => {
        e.preventDefault();
        tutup();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) tutup();
      }}
      className="m-auto max-h-[90vh] w-[490px] max-w-[92vw] flex-col overflow-hidden rounded-[20px] bg-white p-0 text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,.25)] backdrop:bg-[rgba(15,23,42,.45)] open:flex"
    >
      <header className="border-b border-[#E5E7EB] px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2563EB] text-white">
            <Ikon nama="file" ukuran={16} />
          </span>
          <h2 id="judul-modal-tugas" className="text-[15px] font-bold">
            Buat Instrumen Tugas &amp; Asesmen Baru
          </h2>
          <span className="rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-bold text-[#2563EB]">{kodeBaru}</span>
          <button
            type="button"
            onClick={tutup}
            aria-label="Tutup"
            className={`ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-[#F1F5F9] ${FOKUS}`}
          >
            <Ikon nama="tutup" ukuran={16} />
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-[#64748B]">
          Konfigurasikan detail penugasan, alokasi bobot, dan pemetaan Capaian Pembelajaran (CPMK / Sub-CPMK).
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Mata kuliah */}
        <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F3F5F9] p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white">
            {inisial(data.mataKuliah.nama)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold">
              {data.mataKuliah.nama} ({data.mataKuliah.sks} SKS)
            </p>
            <p className="text-[11px] text-[#64748B]">
              T.A. {data.tahunAjaran.label} • {data.mahasiswa} Mahasiswa
            </p>
          </div>
        </div>

        {/* Asesmen ke + judul */}
        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#334155]">Asesmen ke :</span>
            <span className="flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] px-2 focus-within:border-[#60A5FA]">
              <Ikon nama="kalender" ukuran={14} className="shrink-0 text-[#64748B]" />
              <input
                type="number"
                min={1}
                max={16}
                value={pertemuan}
                onChange={(e) => setPertemuan(Math.min(16, Math.max(1, Math.round(e.target.valueAsNumber) || 1)))}
                className="w-full min-w-0 bg-transparent text-[13px] outline-none"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#334155]">
              Judul Asesmen / Tugas <span className="text-[#DC2626]">*</span>
            </span>
            <input
              autoFocus
              value={judul}
              maxLength={120}
              onChange={(e) => setJudul(e.target.value)}
              aria-invalid={sentuh && judulKosong}
              aria-describedby={sentuh && judulKosong ? "galat-judul" : undefined}
              onBlur={() => setSentuh(true)}
              placeholder="Contoh: Analisis Resonansi RLC Seri & Paralel"
              className={`min-h-[38px] w-full rounded-[10px] border px-3 text-[13px] outline-none focus:border-[#60A5FA] ${
                sentuh && judulKosong ? "border-[#DC2626]" : "border-[#E5E7EB]"
              }`}
            />
            {sentuh && judulKosong && (
              <span id="galat-judul" className="mt-1 block text-[11px] text-[#DC2626]">
                Judul tugas wajib diisi.
              </span>
            )}
          </label>
        </div>

        {/* Bobot */}
        <div className="rounded-xl bg-[#F3F5F9] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold">Alokasi Bobot Nilai (%)</span>
            <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[12px] font-bold text-[#1D4ED8]">{bobot}%</span>
          </div>

          <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
            {tugasLingkup.map((t, i) => (
              <span
                key={t.id}
                title={`${t.kode}: ${bobotLain[i]}%`}
                style={{ width: `${bobotLain[i]}%`, background: WARNA_BOBOT[i % 8], opacity: 0.55 }}
              />
            ))}
            <span title={`${kodeBaru}: ${bobot}%`} style={{ width: `${bobot}%` }} className="bg-[#2563EB]" />
          </div>

          <input
            type="range"
            min={1}
            max={adaTugas ? 99 : 100}
            step={1}
            value={bobot}
            disabled={!adaTugas}
            onChange={(e) => setBobot(e.target.valueAsNumber)}
            aria-label="Alokasi bobot nilai"
            className="mt-2 w-full cursor-pointer accent-[#2563EB] disabled:cursor-not-allowed"
          />
          <p className="flex justify-between text-[11px] text-[#64748B]">
            <span>{adaTugas ? "Maks. dapat dialokasikan: 99% dari 100%" : "Tugas pertama otomatis 100%"}</span>
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[#334155]">
            <Ikon nama="info" ukuran={13} className="mt-px shrink-0 text-[#EA580C]" />
            {adaTugas
              ? `Total saat ini ${totalSekarang}%. Menambahkan ${bobot}% akan menyesuaikan bobot instrumen lain secara proporsional menjadi ${100 - bobot}%.`
              : "Belum ada tugas lain, jadi tugas ini memegang seluruh bobot (100%). Bobot akan dibagi ulang saat tugas berikutnya ditambahkan."}
          </p>
        </div>

        {/* Pemetaan */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold">Pemetaan CPMK &amp; Sub-CPMK</h3>
            <span className="text-[11px] font-semibold text-[#2563EB]">
              {data.cpmk.filter((c) => c.sub.some((s) => subDipilih.has(s.id))).length} Terpilih
            </span>
          </div>
          <p className="mb-2 text-[11px] text-[#64748B]">
            Pilih capaian pembelajaran yang diukur oleh instrumen asesmen ini
          </p>

          {data.cpmk.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#E5E7EB] p-4 text-center text-[12px] text-[#64748B]">
              Belum ada CPMK/Sub-CPMK pada mata kuliah ini. Minta admin menyusunnya dulu.
            </p>
          )}

          <ul className="space-y-2">
            {data.cpmk.map((c, idx) => {
              const terpilih = c.sub.some((s) => subDipilih.has(s.id));
              return (
                <li
                  key={c.id}
                  className={`rounded-xl p-3 ${
                    terpilih ? "border-[1.5px] border-[#2563EB]" : "border border-[#E5E7EB]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={terpilih}
                      aria-label={`Pilih semua Sub-CPMK ${c.kode}`}
                      onClick={() => toggleCpmk(idx)}
                      className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border ${FOKUS} ${
                        terpilih ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#94A3B8] bg-white"
                      }`}
                    >
                      {terpilih && <Ikon nama="centang" ukuran={11} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[11px] font-bold text-white">
                          CPMK {c.angka}
                        </span>
                      </p>
                      <p className={`mt-1 text-[12px] leading-snug ${terpilih ? "text-[#334155]" : "text-[#64748B]"}`}>
                        {c.deskripsi}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {c.sub.map((s) => {
                          const on = subDipilih.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              aria-pressed={on}
                              title={s.deskripsi}
                              onClick={() => toggleSub(s.id)}
                              className={`min-h-[26px] max-w-full truncate rounded-md border px-2 text-[11px] ${FOKUS} ${
                                on
                                  ? "border-[#2563EB] bg-[#EFF6FF] font-semibold text-[#1D4ED8]"
                                  : "border-[#E5E7EB] text-[#334155] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              Sub-CPMK {s.angka}
                            </button>
                          );
                        })}
                        {c.cpl.length > 0 && (
                          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[#2563EB]">
                            <Ikon nama="target" ukuran={12} />
                            {c.cpl.map((l) => l.kode).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {galat && (
          <p role="alert" className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#DC2626]">
            {galat}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-5 py-3">
        <p className="flex items-center gap-1.5 text-[11px] text-[#334155]" aria-live="polite">
          <Ikon nama="centang" ukuran={14} className="text-[#2563EB]" />
          <b>{subDipilih.size} Sub-CPMK terpilih</b> • Bobot {bobot}%
          {cplTarget.length > 0 && <> • Target {cplTarget.join(" & ")}</>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={tutup}
            className={`min-h-[34px] rounded-full border border-[#E5E7EB] px-4 text-[12px] font-semibold hover:bg-[#F8FAFC] ${FOKUS}`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={!bisaSimpan}
            className={`flex min-h-[34px] items-center gap-1.5 rounded-full bg-[#2563EB] px-4 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,.30)] hover:bg-[#1D4ED8] ${FOKUS} ${
              bisaSimpan ? "" : "cursor-not-allowed opacity-50"
            }`}
          >
            <Ikon nama="simpan" ukuran={14} />
            {pending ? "Menyimpan..." : "Simpan & Petakan Tugas"}
          </button>
        </div>
      </footer>
    </dialog>
  );
}
