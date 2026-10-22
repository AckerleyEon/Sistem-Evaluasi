"use client";

import { useState } from "react";
import { createCPMK, updateCPMK } from "@/lib/actions/cpmk";
import { ModalShell } from "@/components/admin/mk/ModalShell";
import { BobotField, bobotValid } from "./BobotField";
import { jumlahBobot, kodeBerikutnya, type KomponenCpmk } from "./tipe";

const POLA_KODE = /^CPMK-\d{1,3}$/;

const kelasInput =
  "h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40";

export function ModalCPMK({
  mkId,
  mkKode,
  cpmkMk,
  cpmk,
  onTutup,
  onBerhasil,
}: {
  mkId: string;
  mkKode: string;
  cpmkMk: KomponenCpmk[]; // CPMK milik mata kuliah ini
  cpmk: KomponenCpmk | null; // null = mode tambah
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const terisiLain = jumlahBobot(cpmkMk.filter((c) => c.id !== cpmk?.id));
  const sisaAwal = Math.max(0, 100 - terisiLain);

  const [kode, setKode] = useState(cpmk?.kode ?? kodeBerikutnya("CPMK", cpmkMk.map((c) => c.kode)));
  const [deskripsi, setDeskripsi] = useState(cpmk?.deskripsi ?? "");
  const [bobot, setBobot] = useState(cpmk ? String(cpmk.bobot) : sisaAwal > 0 ? String(sisaAwal) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deskripsiOk = deskripsi.trim().length >= 10 && deskripsi.trim().length <= 500;
  const bobotOk = bobotValid(bobot, terisiLain, 100);
  const valid = POLA_KODE.test(kode.trim()) && deskripsiOk && bobotOk;

  const berubah = cpmk
    ?     kode.trim() !== cpmk.kode ||
    deskripsi.trim() !== cpmk.deskripsi ||
    bobot !== String(cpmk.bobot)
    : deskripsi.trim() !== "";

  function tutup() {
    if (berubah && !window.confirm("Buang perubahan yang belum disimpan?")) return;
    onTutup();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.set("kode", kode.trim());
    fd.set("deskripsi", deskripsi);
    fd.set("bobot", bobot);
    const hasil = cpmk ? await updateCPMK(cpmk.id, fd) : await createCPMK(mkId, fd);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(cpmk ? `${hasil.kode} berhasil diperbarui` : `${hasil.kode} ditambahkan ke ${mkKode}`);
  }

  return (
    <ModalShell onTutup={tutup} lebar="max-w-md">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FD]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#111827]">{cpmk ? "Sesuaikan CPMK" : "Tambah Butir CPMK Baru"}</h2>
          <p className="text-[13px] text-[#6B7280]">
            {cpmk
              ? `CPMK milik ${mkKode}.`
              : `CPMK ini milik ${mkKode} dan langsung masuk hierarki mata kuliah tersebut.`}
          </p>
        </div>
        <button type="button" onClick={tutup} aria-label="Tutup" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-[#4B5563]">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cpmk-kode" className="mb-2 block text-[13px] font-medium text-[#111827]">Nomor / Kode</label>
          <div className="flex items-center gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#DCE7FB] text-sm font-bold text-[#2F6BE8]">
              {kode.match(/(\d+)$/)?.[1] ?? "#"}
            </span>
            <input id="cpmk-kode" value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" className={kelasInput} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="cpmk-deskripsi" className="text-[13px] font-medium text-[#111827]">Deskripsi Capaian Pembelajaran</label>
            <span className="text-xs text-[#6B7280]">{deskripsi.length}/500</span>
          </div>
          <textarea
            id="cpmk-deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Mampu merancang dan mengevaluasi…"
            className="w-full resize-y rounded-[10px] bg-[#EEF3FD] p-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>

        <BobotField label="Alokasi Bobot CPMK" nilai={bobot} onChange={setBobot} terisiLain={terisiLain} batas={100} />

        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={tutup} className="h-11 rounded-full bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
            Batal
          </button>
          <button
            type="submit"
            disabled={!valid || loading || (cpmk !== null && !berubah)}
            className="h-11 rounded-full bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan…" : cpmk ? "Simpan Perubahan" : "+ Tambahkan Butir CPMK"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}