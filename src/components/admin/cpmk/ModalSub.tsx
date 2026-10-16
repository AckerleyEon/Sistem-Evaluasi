"use client";

import { useState } from "react";
import { createSubCPMK, updateSubCPMK } from "@/lib/actions/sub-cpmk";
import { ModalShell } from "@/components/admin/mk/ModalShell";
import { BobotField, bobotValid } from "./BobotField";
import { kodeBerikutnya, type KomponenCpmk, type KomponenSub } from "./tipe";

const POLA_KODE = /^Sub-CPMK-\d{1,3}$/;

const kelasInput =
  "h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40";

export type KonteksKaitan = { cpmk: KomponenCpmk; bobotAwal: number; terisiLain: number };

export function ModalSub({
  semuaSub,
  sub,
  konteks,
  onTutup,
  onBerhasil,
}: {
  semuaSub: KomponenSub[];
  sub: KomponenSub | null; // null = mode tambah
  konteks: KonteksKaitan | null; // diisi kalau dibuka dari hierarki (bobot kaitan ikut diubah)
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const [kode, setKode] = useState(sub?.kode ?? kodeBerikutnya("Sub-CPMK", semuaSub.map((s) => s.kode)));
  const [deskripsi, setDeskripsi] = useState(sub?.deskripsi ?? "");
  const [bobot, setBobot] = useState(konteks ? String(konteks.bobotAwal) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deskripsiOk = deskripsi.trim().length >= 10 && deskripsi.trim().length <= 500;
  const bobotOk = !konteks || bobotValid(bobot, konteks.terisiLain, konteks.cpmk.bobot);
  const valid = POLA_KODE.test(kode.trim()) && deskripsiOk && bobotOk;

  const berubah = sub
    ? kode.trim() !== sub.kode ||
      deskripsi.trim() !== sub.deskripsi ||
      (konteks !== null && bobot !== String(konteks.bobotAwal))
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
    if (konteks) {
      fd.set("cpmkId", konteks.cpmk.id);
      fd.set("bobot", bobot);
    }
    const hasil = sub ? await updateSubCPMK(sub.id, fd) : await createSubCPMK(fd);
    setLoading(false);
    if (hasil.error) {
      setError(hasil.error);
      return;
    }
    onBerhasil(sub ? `${hasil.kode} berhasil diperbarui` : `${hasil.kode} berhasil dibuat`);
  }

  return (
    <ModalShell onTutup={tutup} lebar="max-w-md">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FD]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h6M4 12h6M4 19h6" />
            <path d="M10 5h4a2 2 0 0 1 2 2v0M10 12h10M10 19h4a2 2 0 0 0 2-2v0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#111827]">{sub ? "Sesuaikan Sub-CPMK" : "Tambah Sub-CPMK Baru"}</h2>
          <p className="text-[13px] text-[#6B7280]">
            {sub
              ? konteks
                ? `Bobot berlaku untuk kaitan ke ${konteks.cpmk.kode}. Kode dan deskripsi berlaku di semua CPMK yang memakainya.`
                : "Kode dan deskripsi berlaku di semua CPMK yang memakai Sub-CPMK ini."
              : "Sub-CPMK baru berdiri sendiri. Kaitkan ke CPMK lewat hierarki di bawah."}
          </p>
        </div>
        <button type="button" onClick={tutup} aria-label="Tutup" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-[#4B5563]">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sub-kode" className="mb-2 block text-[13px] font-medium text-[#111827]">Nomor / Kode</label>
          <div className="flex items-center gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#DCE7FB] text-sm font-bold text-[#2F6BE8]">
              {kode.match(/(\d+)$/)?.[1] ?? "#"}
            </span>
            <input id="sub-kode" value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" className={kelasInput} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="sub-deskripsi" className="text-[13px] font-medium text-[#111827]">Deskripsi Capaian Pembelajaran</label>
            <span className="text-xs text-[#6B7280]">{deskripsi.length}/500</span>
          </div>
          <textarea
            id="sub-deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Mampu menghitung tegangan dan arus…"
            className="w-full resize-y rounded-[10px] bg-[#EEF3FD] p-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>

        {konteks && (
          <BobotField
            label="Alokasi Bobot Sub-CPMK"
            nilai={bobot}
            onChange={setBobot}
            terisiLain={konteks.terisiLain}
            batas={konteks.cpmk.bobot}
          />
        )}

        {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={tutup} className="h-11 rounded-full bg-[#EEF3FD] text-sm font-semibold text-[#111827]">
            Batal
          </button>
          <button
            type="submit"
            disabled={!valid || loading || (sub !== null && !berubah)}
            className="h-11 rounded-full bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan…" : sub ? "Simpan Perubahan" : "+ Tambahkan Butir Sub-CPMK"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}