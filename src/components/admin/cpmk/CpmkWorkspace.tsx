"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cekDampakCPMK, hapusCPMK } from "@/lib/actions/cpmk";
import { cekDampakSub, hapusSubCPMK, kaitkanSubCPMK, lepasSubCPMK } from "@/lib/actions/sub-cpmk";
import { BannerMK } from "./BannerMK";
import { PemilihMK } from "./PemilihMK";
import { BlokHierarki } from "./BlokHierarki";
import { BlokSubBebas } from "./BlokSubBebas";
import { ModalCPMK } from "./ModalCPMK";
import { ModalSub } from "./ModalSub";
import { ModalKaitkan } from "./ModalKaitkan";
import { ModalHapusItem } from "./ModalHapusItem";
import {
  jumlahBobot,
  type CpmkTerkait,
  type CplOpsi,
  type DampakCpmk,
  type DampakSub,
  type KomponenCpmk,
  type KomponenSub,
  type KonteksSub,
  type MkRingkas,
  type TautanSub,
} from "./tipe";

const urutKode = (a: { kode: string }, b: { kode: string }) =>
  a.kode.localeCompare(b.kode, undefined, { numeric: true });

type ModalState =
  | { jenis: "cpmk"; cpmk: KomponenCpmk | null }
  | { jenis: "sub"; sub: KomponenSub | null; cpmkId: string | null }
  | { jenis: "kaitkanSub"; cpmkId: string }
  | null;

type AksiState =
  | { tipe: "hapus-cpmk"; item: KomponenCpmk; dampak: DampakCpmk | null }
  | { tipe: "hapus-sub"; item: KomponenSub; dampak: DampakSub | null }
  | { tipe: "lepas-sub"; item: KomponenSub; cpmkId: string; cpmkKode: string; dampak: DampakSub | null }
  | null;

export function CpmkWorkspace({
  daftarMK,
  daftarCpl,
  selectedId,
  cpmkMk,
  subMk,
  tautanSub,
}: {
  daftarMK: MkRingkas[];
  daftarCpl: CplOpsi[];
  selectedId: string | null;
  cpmkMk: KomponenCpmk[];
  subMk: KomponenSub[];
  tautanSub: TautanSub[];
}) {
  const mk = daftarMK.find((m) => m.id === selectedId) ?? null;

  const [modal, setModal] = useState<ModalState>(null);
  const [aksi, setAksi] = useState<AksiState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tertutup, setTertutup] = useState<Set<string>>(new Set());

  const subById = new Map(subMk.map((s) => [s.id, s]));
  const cpmkById = new Map(cpmkMk.map((c) => [c.id, c]));

  const hierarki: CpmkTerkait[] = cpmkMk.map((c) => ({
    ...c,
    sub: tautanSub
      .filter((t) => t.cpmkId === c.id)
      .flatMap((t) => {
        const s = subById.get(t.subCpmkId);
        return s ? [{ ...s, bobot: t.bobot }] : [];
      })
      .sort(urutKode),
  }));
  const subBebas = subMk.filter((s) => !tautanSub.some((t) => t.subCpmkId === s.id));
  const semuaTerbuka = hierarki.every((c) => !tertutup.has(c.id));

  const blokKaitkan = modal?.jenis === "kaitkanSub" ? hierarki.find((c) => c.id === modal.cpmkId) ?? null : null;
  const cpmkEdit = modal?.jenis === "cpmk" ? modal.cpmk : null;
  const totalSubEdit = cpmkEdit ? jumlahBobot(tautanSub.filter((t) => t.cpmkId === cpmkEdit.id)) : 0;

  function bangunKonteksSub(cpmkId: string | null, subId: string | undefined): KonteksSub | null {
    if (!cpmkId || !subId) return null;
    const blok = hierarki.find((c) => c.id === cpmkId);
    const entri = blok?.sub.find((s) => s.id === subId);
    if (!blok || !entri) return null;
    return {
      cpmkId,
      cpmkKode: blok.kode,
      bobotAwal: entri.bobot,
      terisiLain: jumlahBobot(blok.sub.filter((s) => s.id !== subId)),
      batas: blok.bobot,
    };
  }
  const konteksSub = modal?.jenis === "sub" ? bangunKonteksSub(modal.cpmkId, modal.sub?.id) : null;

  function tampilToast(pesan: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(pesan);
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }

  function toggleBlok(id: string) {
    setTertutup((prev) => {
      const baru = new Set(prev);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  async function bukaHapusCpmk(item: KomponenCpmk) {
    setAksi({ tipe: "hapus-cpmk", item, dampak: null });
    const dampak = await cekDampakCPMK(item.id);
    setAksi((prev) => (prev && prev.tipe === "hapus-cpmk" && prev.item.id === item.id ? { ...prev, dampak } : prev));
  }

  async function bukaHapusSub(item: KomponenSub) {
    setAksi({ tipe: "hapus-sub", item, dampak: null });
    const dampak = await cekDampakSub(item.id);
    setAksi((prev) => (prev && prev.tipe === "hapus-sub" && prev.item.id === item.id ? { ...prev, dampak } : prev));
  }

  async function bukaLepasSub(item: KomponenSub, cpmkId: string, cpmkKode: string) {
    setAksi({ tipe: "lepas-sub", item, cpmkId, cpmkKode, dampak: null });
    const dampak = await cekDampakSub(item.id, cpmkId);
    setAksi((prev) =>
      prev && prev.tipe === "lepas-sub" && prev.item.id === item.id && prev.cpmkId === cpmkId
        ? { ...prev, dampak }
        : prev
    );
  }

  const aksiHapusCpmk = aksi?.tipe === "hapus-cpmk" ? aksi : null;
  const aksiHapusSub = aksi?.tipe === "hapus-sub" ? aksi : null;
  const aksiLepasSub = aksi?.tipe === "lepas-sub" ? aksi : null;

  return (
    <div className="space-y-6">
      {toast && (
        <div role="status" className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-medium text-white shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Konfigurasi CPMK &amp; Sub-CPMK</h1>
          <p className="text-[13px] text-[#6B7280]">Pilih mata kuliah dulu, lalu atur CPMK dan Sub-CPMK miliknya</p>
        </div>
        {mk && (
          <div className="flex flex-wrap items-center gap-2">
            <PemilihMK mk={mk} daftarMK={daftarMK} />
            <button
              onClick={() => setModal({ jenis: "cpmk", cpmk: null })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#2F6BE8] px-4 text-sm font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
            >
              <span aria-hidden="true">+</span> Tambah CPMK
            </button>
            <button
              onClick={() => setModal({ jenis: "sub", sub: null, cpmkId: null })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#2F6BE8] px-4 text-sm font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
            >
              <span aria-hidden="true">+</span> Tambah Sub-CPMK
            </button>
          </div>
        )}
      </div>

      {mk ? (
        <>
          <BannerMK
            mk={mk}
            totalBobot={jumlahBobot(cpmkMk)}
            jumlahCpmk={cpmkMk.length}
            jumlahSub={subMk.length}
            semuaTerbuka={semuaTerbuka}
            onToggleSemua={() => setTertutup(semuaTerbuka ? new Set(hierarki.map((c) => c.id)) : new Set())}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111827]">Hierarki Capaian Pembelajaran</h2>
                <span className="rounded-full bg-[#F1F3F5] px-2.5 py-0.5 text-xs text-[#6B7280]">Struktur CPMK &amp; Sub-CPMK</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <button onClick={() => setTertutup(new Set())} className="text-[#2F6BE8] hover:underline">Buka Semua</button>
                <span aria-hidden="true" className="text-[#C4C9D2]">•</span>
                <button onClick={() => setTertutup(new Set(hierarki.map((c) => c.id)))} className="text-[#6B7280] hover:underline">Tutup Semua</button>
              </div>
            </div>

            {hierarki.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
                <p className="mb-1 text-base font-bold text-[#111827]">Belum ada CPMK di mata kuliah ini</p>
                <p className="mb-4 text-sm text-[#6B7280]">Tambahkan CPMK pertama, petakan ke CPL, dan tentukan bobotnya.</p>
                <button onClick={() => setModal({ jenis: "cpmk", cpmk: null })} className="h-10 rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white">
                  Tambah CPMK
                </button>
              </div>
            ) : (
              hierarki.map((c) => (
                <BlokHierarki
                  key={c.id}
                  cpmk={c}
                  terbuka={!tertutup.has(c.id)}
                  onToggle={() => toggleBlok(c.id)}
                  onKaitkanSub={() => setModal({ jenis: "kaitkanSub", cpmkId: c.id })}
                  onEditCpmk={() => setModal({ jenis: "cpmk", cpmk: cpmkById.get(c.id) ?? null })}
                  onHapusCpmk={() => {
                    const asli = cpmkById.get(c.id);
                    if (asli) bukaHapusCpmk(asli);
                  }}
                  onEditSub={(s) => setModal({ jenis: "sub", sub: subById.get(s.id) ?? null, cpmkId: c.id })}
                  onLepasSub={(s) => {
                    const asli = subById.get(s.id);
                    if (asli) bukaLepasSub(asli, c.id, c.kode);
                  }}
                />
              ))
            )}

            <BlokSubBebas
              daftar={subBebas}
              onEdit={(s) => setModal({ jenis: "sub", sub: s, cpmkId: null })}
              onHapus={bukaHapusSub}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <p className="mb-1 text-base font-bold text-[#111827]">Belum ada mata kuliah</p>
          <p className="mb-4 text-sm text-[#6B7280]">Tambahkan mata kuliah dulu, lalu pilih di sini untuk mengatur CPMK-nya.</p>
          <Link href="/admin/data-master/mata-kuliah" className="inline-flex h-10 items-center rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white">
            Tambah Mata Kuliah
          </Link>
        </div>
      )}

      {mk && modal?.jenis === "cpmk" && (
        <ModalCPMK
          key={modal.cpmk?.id ?? "baru"}
          mkId={mk.id}
          mkKode={mk.kode}
          cpmkMk={cpmkMk}
          totalSub={totalSubEdit}
          daftarCpl={daftarCpl}
          cpmk={cpmkEdit}
          onTutup={() => setModal(null)}
          onBerhasil={(pesan) => {
            setModal(null);
            tampilToast(pesan);
          }}
        />
      )}

      {mk && modal?.jenis === "sub" && (
        <ModalSub
          key={`${modal.sub?.id ?? "baru"}-${modal.cpmkId ?? "bebas"}`}
          mkId={mk.id}
          mkKode={mk.kode}
          subMk={subMk}
          sub={modal.sub}
          konteks={konteksSub}
          onTutup={() => setModal(null)}
          onBerhasil={(pesan) => {
            setModal(null);
            tampilToast(pesan);
          }}
        />
      )}

      {mk && blokKaitkan && (
        <ModalKaitkan
          key={blokKaitkan.id}
          judul={`Kaitkan Sub-CPMK ke ${blokKaitkan.kode}`}
          subjudul={`Pilih Sub-CPMK milik ${mk.kode}, termasuk yang sudah dipakai CPMK lain. Bobot total maksimal ${blokKaitkan.bobot}% (bobot ${blokKaitkan.kode}).`}
          kosong={`Belum ada Sub-CPMK yang tersedia di ${mk.kode}. Semua sudah dikaitkan ke CPMK ini, atau belum ada yang dibuat.`}
          labelBuatBaru="Tambah Sub-CPMK baru"
          kandidat={subMk
            .filter((s) => !tautanSub.some((t) => t.cpmkId === blokKaitkan.id && t.subCpmkId === s.id))
            .map((s) => ({
              id: s.id,
              kode: s.kode,
              deskripsi: s.deskripsi,
              badges: tautanSub
                .filter((t) => t.subCpmkId === s.id)
                .map((t) => `Di ${cpmkById.get(t.cpmkId)?.kode ?? "CPMK lain"}`),
            }))}
          terisiLain={jumlahBobot(blokKaitkan.sub)}
          batas={blokKaitkan.bobot}
          labelSimpan="Kaitkan"
          onSimpan={(items) => kaitkanSubCPMK(blokKaitkan.id, JSON.stringify(items))}
          onBuatBaru={() => setModal({ jenis: "sub", sub: null, cpmkId: null })}
          onTutup={() => setModal(null)}
          onBerhasil={(jumlah) => {
            setModal(null);
            tampilToast(`${jumlah} Sub-CPMK dikaitkan ke ${blokKaitkan.kode}`);
          }}
        />
      )}

      {aksiHapusCpmk && (
        <ModalHapusItem
          key={`hapus-cpmk-${aksiHapusCpmk.item.id}`}
          judul={`Hapus ${aksiHapusCpmk.item.kode}?`}
          memeriksa={aksiHapusCpmk.dampak === null}
          blokir={null}
          labelHapus="Hapus CPMK"
          onTutup={() => setAksi(null)}
          onHapus={async () => {
            const hasil = await hapusCPMK(aksiHapusCpmk.item.id);
            if (!hasil.error) {
              setAksi(null);
              tampilToast(`${aksiHapusCpmk.item.kode} dihapus`);
            }
            return hasil;
          }}
        >
          {aksiHapusCpmk.dampak && (
            <>
              <p>
                CPMK dihapus permanen beserta pemetaan ke CPL. Sub-CPMK di dalamnya (
                {aksiHapusCpmk.dampak.jumlahSub}) tidak ikut terhapus: dilepas dari CPMK ini dan berdiri sendiri.
              </p>
              {aksiHapusCpmk.dampak.jumlahNilai > 0 && (
                <p>
                  {aksiHapusCpmk.dampak.jumlahNilai} nilai mahasiswa tetap tersimpan. Hasil capaian dihitung ulang
                  tanpa CPMK ini.
                </p>
              )}
              <p className={aksiHapusCpmk.dampak.totalSetelah === 100 ? "" : "font-semibold text-[#B45309]"}>
                Total bobot mata kuliah akan menjadi {aksiHapusCpmk.dampak.totalSetelah}%{" "}
                {aksiHapusCpmk.dampak.totalSetelah === 100 ? "(valid)" : "(tidak valid)"}.
              </p>
            </>
          )}
        </ModalHapusItem>
      )}

      {aksiHapusSub && (
        <ModalHapusItem
          key={`hapus-sub-${aksiHapusSub.item.id}`}
          judul={`Hapus ${aksiHapusSub.item.kode}?`}
          memeriksa={aksiHapusSub.dampak === null}
          blokir={
            aksiHapusSub.dampak && aksiHapusSub.dampak.jumlahNilai > 0
              ? `Sub-CPMK ini masih punya ${aksiHapusSub.dampak.jumlahNilai} nilai mahasiswa terkait. Lepas dari CPMK dulu, lalu hapus.`
              : null
          }
          labelHapus="Hapus Sub-CPMK"
          onTutup={() => setAksi(null)}
          onHapus={async () => {
            const hasil = await hapusSubCPMK(aksiHapusSub.item.id);
            if (!hasil.error) {
              setAksi(null);
              tampilToast(`${aksiHapusSub.item.kode} dihapus`);
            }
            return hasil;
          }}
        >
          {aksiHapusSub.dampak && (
            <p>
              Sub-CPMK dihapus permanen beserta pemetaannya ke tugas.
              {aksiHapusSub.dampak.lainDi.length > 0
                ? ` Kaitan ke ${aksiHapusSub.dampak.lainDi.join(", ")} ikut terputus.`
                : ""}
            </p>
          )}
        </ModalHapusItem>
      )}

      {aksiLepasSub && (
        <ModalHapusItem
          key={`lepas-sub-${aksiLepasSub.item.id}-${aksiLepasSub.cpmkId}`}
          judul={`Lepas ${aksiLepasSub.item.kode} dari ${aksiLepasSub.cpmkKode}?`}
          memeriksa={aksiLepasSub.dampak === null}
          blokir={null}
          labelHapus="Lepas dari CPMK"
          onTutup={() => setAksi(null)}
          onHapus={async () => {
            const hasil = await lepasSubCPMK(aksiLepasSub.item.id, aksiLepasSub.cpmkId);
            if (!hasil.error) {
              setAksi(null);
              tampilToast(`${aksiLepasSub.item.kode} dilepas dari ${aksiLepasSub.cpmkKode}`);
            }
            return hasil;
          }}
        >
          {aksiLepasSub.dampak && (
            <>
              <p>
                Kaitan {aksiLepasSub.item.kode} ke {aksiLepasSub.cpmkKode} terputus (bobot{" "}
                {aksiLepasSub.dampak.bobot}% dilepas).
              </p>
              <p>
                {aksiLepasSub.dampak.lainDi.length > 0
                  ? `Sub-CPMK tetap dipakai di ${aksiLepasSub.dampak.lainDi.join(", ")}, jadi pemetaannya ke tugas dipertahankan.`
                  : "Sub-CPMK kembali berdiri sendiri dan pemetaannya ke tugas ikut dilepas."}
              </p>
              {aksiLepasSub.dampak.jumlahNilai > 0 && (
                <p>
                  {aksiLepasSub.dampak.jumlahNilai} nilai mahasiswa tetap tersimpan. Hasil capaian dihitung ulang
                  tanpa kaitan ini.
                </p>
              )}
            </>
          )}
        </ModalHapusItem>
      )}
    </div>
  );
}