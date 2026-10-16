"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cekDampakCPMK, hapusCPMK, kaitkanCPMK, lepasCPMK } from "@/lib/actions/cpmk";
import { cekDampakSub, hapusSubCPMK, kaitkanSubCPMK, lepasSubCPMK } from "@/lib/actions/sub-cpmk";
import { BannerMK } from "./BannerMK";
import { KartuDaftar, type ItemDaftar } from "./KartuDaftar";
import { BlokHierarki } from "./BlokHierarki";
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
  type MkRingkas,
  type TautanSub,
} from "./tipe";

const urutKode = (a: { kode: string }, b: { kode: string }) =>
  a.kode.localeCompare(b.kode, undefined, { numeric: true });

type ModalState =
  | { jenis: "cpmk"; cpmk: KomponenCpmk | null }
  | { jenis: "sub"; sub: KomponenSub | null; cpmkId: string | null }
  | { jenis: "kaitkanCpmk" }
  | { jenis: "kaitkanSub"; cpmkId: string }
  | null;

type AksiState =
  | { tipe: "hapus-cpmk" | "lepas-cpmk"; item: KomponenCpmk; dampak: DampakCpmk | null }
  | { tipe: "hapus-sub"; item: KomponenSub; dampak: DampakSub | null }
  | { tipe: "lepas-sub"; item: KomponenSub; cpmk: KomponenCpmk; dampak: DampakSub | null }
  | null;

export function CpmkWorkspace({
  daftarMK,
  daftarCpl,
  selectedId,
  semuaCpmk,
  semuaSub,
  tautanSub,
}: {
  daftarMK: MkRingkas[];
  daftarCpl: CplOpsi[];
  selectedId: string | null;
  semuaCpmk: KomponenCpmk[];
  semuaSub: KomponenSub[];
  tautanSub: TautanSub[];
}) {
  const mk = daftarMK.find((m) => m.id === selectedId) ?? null;

  const [modal, setModal] = useState<ModalState>(null);
  const [aksi, setAksi] = useState<AksiState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accordion kartu: null = default (item pertama), "tutup" = semua tertutup
  const [accCpmk, setAccCpmk] = useState<string | null>(null);
  const [accSub, setAccSub] = useState<string | null>(null);
  const [tertutup, setTertutup] = useState<Set<string>>(new Set());

  const terbukaCpmk = accCpmk === null ? semuaCpmk[0]?.id ?? null : accCpmk === "tutup" ? null : accCpmk;
  const terbukaSub = accSub === null ? semuaSub[0]?.id ?? null : accSub === "tutup" ? null : accSub;

  const subById = new Map(semuaSub.map((s) => [s.id, s]));
  const cpmkById = new Map(semuaCpmk.map((c) => [c.id, c]));

  const cpmkMk: CpmkTerkait[] = mk
    ? semuaCpmk
        .filter((c) => c.mataKuliahId === mk.id)
        .map((c) => ({
          ...c,
          sub: tautanSub
            .filter((t) => t.cpmkId === c.id)
            .flatMap((t) => {
              const s = subById.get(t.subCpmkId);
              return s ? [{ ...s, bobot: t.bobot }] : [];
            })
            .sort(urutKode),
        }))
    : [];
  const jumlahSubMk = new Set(cpmkMk.flatMap((c) => c.sub.map((s) => s.id))).size;
  const semuaTerbuka = cpmkMk.every((c) => !tertutup.has(c.id));

  const cpmkKaitkan = modal?.jenis === "kaitkanSub" ? cpmkMk.find((c) => c.id === modal.cpmkId) ?? null : null;

  const itemCpmk: ItemDaftar[] = semuaCpmk.map((c) => ({
    id: c.id,
    judul: c.kode,
    badges: c.cpl.map((x) => x.kode),
    deskripsi: c.deskripsi,
    bobot: c.mataKuliahId ? c.bobot : null,
    belumDikaitkan: c.mataKuliahId === null,
  }));
  const itemSub: ItemDaftar[] = semuaSub.map((s) => {
    const dipakaiDi = tautanSub
      .filter((t) => t.subCpmkId === s.id)
      .map((t) => cpmkById.get(t.cpmkId)?.kode)
      .filter((k): k is string => !!k)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return {
      id: s.id,
      judul: s.kode,
      badges: dipakaiDi,
      deskripsi: s.deskripsi,
      bobot: null,
      belumDikaitkan: dipakaiDi.length === 0,
    };
  });

  function bangunKonteks(cpmkId: string | null, subId: string | undefined) {
    if (!cpmkId || !subId) return null;
    const cpmk = cpmkById.get(cpmkId);
    const tautan = tautanSub.find((t) => t.cpmkId === cpmkId && t.subCpmkId === subId);
    if (!cpmk || !tautan) return null;
    return {
      cpmk,
      bobotAwal: tautan.bobot,
      terisiLain: jumlahBobot(tautanSub.filter((t) => t.cpmkId === cpmkId && t.subCpmkId !== subId)),
    };
  }

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

  async function bukaAksiCpmk(tipe: "hapus-cpmk" | "lepas-cpmk", item: KomponenCpmk) {
    setAksi({ tipe, item, dampak: null });
    const dampak = await cekDampakCPMK(item.id);
    setAksi((prev) =>
      prev && (prev.tipe === "hapus-cpmk" || prev.tipe === "lepas-cpmk") && prev.item.id === item.id
        ? { tipe, item, dampak }
        : prev
    );
  }

  async function bukaHapusSub(item: KomponenSub) {
    setAksi({ tipe: "hapus-sub", item, dampak: null });
    const dampak = await cekDampakSub(item.id);
    setAksi((prev) => (prev && prev.tipe === "hapus-sub" && prev.item.id === item.id ? { ...prev, dampak } : prev));
  }

  async function bukaLepasSub(item: KomponenSub, cpmk: KomponenCpmk) {
    setAksi({ tipe: "lepas-sub", item, cpmk, dampak: null });
    const dampak = await cekDampakSub(item.id, cpmk.id);
    setAksi((prev) =>
      prev && prev.tipe === "lepas-sub" && prev.item.id === item.id && prev.cpmk.id === cpmk.id
        ? { ...prev, dampak }
        : prev
    );
  }

  const aksiCpmk = aksi && (aksi.tipe === "hapus-cpmk" || aksi.tipe === "lepas-cpmk") ? aksi : null;
  const aksiHapusSub = aksi?.tipe === "hapus-sub" ? aksi : null;
  const aksiLepasSub = aksi?.tipe === "lepas-sub" ? aksi : null;
  const lepasCpmkMode = aksiCpmk?.tipe === "lepas-cpmk";

  const konteksModalSub = modal?.jenis === "sub" ? bangunKonteks(modal.cpmkId, modal.sub?.id) : null;

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Konfigurasi CPMK &amp; Sub-CPMK</h1>
          <p className="text-[13px] text-[#6B7280]">Struktur keterkaitan antara mata kuliah, CPMK dan Sub-CPMK</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <KartuDaftar
          judul="Daftar CPMK"
          subjudul="Rincian CPMK yang sudah ditambahkan"
          kosong="Belum ada CPMK. Buat lewat tombol Tambah CPMK."
          prefiks="acc-cpmk"
          items={itemCpmk}
          terbukaId={terbukaCpmk}
          onToggle={(id) => setAccCpmk(terbukaCpmk === id ? "tutup" : id)}
          onEdit={(id) => setModal({ jenis: "cpmk", cpmk: cpmkById.get(id) ?? null })}
          onHapus={(id) => {
            const c = cpmkById.get(id);
            if (c) bukaAksiCpmk("hapus-cpmk", c);
          }}
        />
        <KartuDaftar
          judul="Daftar Sub-CPMK"
          subjudul="Rincian Sub-CPMK yang sudah ditambahkan"
          kosong="Belum ada Sub-CPMK. Buat lewat tombol Tambah Sub-CPMK."
          prefiks="acc-sub"
          items={itemSub}
          terbukaId={terbukaSub}
          onToggle={(id) => setAccSub(terbukaSub === id ? "tutup" : id)}
          onEdit={(id) => setModal({ jenis: "sub", sub: subById.get(id) ?? null, cpmkId: null })}
          onHapus={(id) => {
            const s = subById.get(id);
            if (s) bukaHapusSub(s);
          }}
        />
      </div>

      {mk ? (
        <>
          <BannerMK
            mk={mk}
            daftarMK={daftarMK}
            totalBobot={jumlahBobot(cpmkMk)}
            jumlahCpmk={cpmkMk.length}
            jumlahSub={jumlahSubMk}
            semuaTerbuka={semuaTerbuka}
            onToggleSemua={() => setTertutup(semuaTerbuka ? new Set(cpmkMk.map((c) => c.id)) : new Set())}
            onKaitkanCpmk={() => setModal({ jenis: "kaitkanCpmk" })}
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
                <button onClick={() => setTertutup(new Set(cpmkMk.map((c) => c.id)))} className="text-[#6B7280] hover:underline">Tutup Semua</button>
              </div>
            </div>

            {cpmkMk.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
                <p className="mb-1 text-base font-bold text-[#111827]">Belum ada CPMK yang dikaitkan ke mata kuliah ini</p>
                <p className="mb-4 text-sm text-[#6B7280]">Pilih dari daftar CPMK yang sudah dibuat, lalu tentukan bobotnya.</p>
                <button onClick={() => setModal({ jenis: "kaitkanCpmk" })} className="h-10 rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white">
                  Kaitkan CPMK
                </button>
              </div>
            ) : (
              cpmkMk.map((c) => (
                <BlokHierarki
                  key={c.id}
                  cpmk={c}
                  terbuka={!tertutup.has(c.id)}
                  onToggle={() => toggleBlok(c.id)}
                  onKaitkanSub={() => setModal({ jenis: "kaitkanSub", cpmkId: c.id })}
                  onLepasCpmk={() => bukaAksiCpmk("lepas-cpmk", c)}
                  onEditSub={(s) => setModal({ jenis: "sub", sub: subById.get(s.id) ?? null, cpmkId: c.id })}
                  onLepasSub={(s) => {
                    const sub = subById.get(s.id);
                    if (sub) bukaLepasSub(sub, c);
                  }}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <p className="mb-1 text-base font-bold text-[#111827]">Belum ada mata kuliah</p>
          <p className="mb-4 text-sm text-[#6B7280]">Tambahkan mata kuliah dulu agar CPMK bisa dikaitkan.</p>
          <Link href="/admin/data-master/mata-kuliah" className="inline-flex h-10 items-center rounded-full bg-[#2F6BE8] px-5 text-sm font-semibold text-white">
            Tambah Mata Kuliah
          </Link>
        </div>
      )}

      {modal?.jenis === "cpmk" && (
        <ModalCPMK
          key={modal.cpmk?.id ?? "baru"}
          semuaCpmk={semuaCpmk}
          tautanSub={tautanSub}
          daftarCpl={daftarCpl}
          cpmk={modal.cpmk}
          onTutup={() => setModal(null)}
          onBerhasil={(pesan) => {
            setModal(null);
            tampilToast(pesan);
          }}
        />
      )}

      {modal?.jenis === "sub" && (
        <ModalSub
          key={`${modal.sub?.id ?? "baru"}-${modal.cpmkId ?? "master"}`}
          semuaSub={semuaSub}
          sub={modal.sub}
          konteks={konteksModalSub}
          onTutup={() => setModal(null)}
          onBerhasil={(pesan) => {
            setModal(null);
            tampilToast(pesan);
          }}
        />
      )}

      {modal?.jenis === "kaitkanCpmk" && mk && (
        <ModalKaitkan
          judul="Kaitkan CPMK ke Mata Kuliah"
          subjudul={`Pilih CPMK dari daftar untuk ${mk.kode} • ${mk.nama}, lalu tentukan bobotnya.`}
          kosong="Tidak ada CPMK yang tersedia. Semua CPMK sudah dikaitkan, atau belum ada yang dibuat."
          labelBuatBaru="Tambah CPMK baru"
          kandidat={semuaCpmk
            .filter((c) => c.mataKuliahId === null)
            .map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi, badges: c.cpl.map((x) => x.kode) }))}
          terisiLain={jumlahBobot(cpmkMk)}
          batas={100}
          labelSimpan="Kaitkan"
          onSimpan={(items) => kaitkanCPMK(mk.id, JSON.stringify(items))}
          onBuatBaru={() => setModal({ jenis: "cpmk", cpmk: null })}
          onTutup={() => setModal(null)}
          onBerhasil={(jumlah) => {
            setModal(null);
            tampilToast(`${jumlah} CPMK dikaitkan ke ${mk.kode}`);
          }}
        />
      )}

      {cpmkKaitkan && (
        <ModalKaitkan
          key={cpmkKaitkan.id}
          judul={`Kaitkan Sub-CPMK ke ${cpmkKaitkan.kode}`}
          subjudul={`Pilih Sub-CPMK dari daftar, termasuk yang sudah dipakai CPMK lain. Bobot total maksimal ${cpmkKaitkan.bobot}% (bobot ${cpmkKaitkan.kode}).`}
          kosong="Tidak ada Sub-CPMK yang tersedia. Semua Sub-CPMK sudah dikaitkan ke CPMK ini, atau belum ada yang dibuat."
          labelBuatBaru="Tambah Sub-CPMK baru"
          kandidat={semuaSub
            .filter((s) => !tautanSub.some((t) => t.cpmkId === cpmkKaitkan.id && t.subCpmkId === s.id))
            .map((s) => ({
              id: s.id,
              kode: s.kode,
              deskripsi: s.deskripsi,
              badges: tautanSub
                .filter((t) => t.subCpmkId === s.id)
                .map((t) => `Di ${cpmkById.get(t.cpmkId)?.kode ?? "CPMK lain"}`),
            }))}
          terisiLain={jumlahBobot(cpmkKaitkan.sub)}
          batas={cpmkKaitkan.bobot}
          labelSimpan="Kaitkan"
          onSimpan={(items) => kaitkanSubCPMK(cpmkKaitkan.id, JSON.stringify(items))}
          onBuatBaru={() => setModal({ jenis: "sub", sub: null, cpmkId: null })}
          onTutup={() => setModal(null)}
          onBerhasil={(jumlah) => {
            setModal(null);
            tampilToast(`${jumlah} Sub-CPMK dikaitkan ke ${cpmkKaitkan.kode}`);
          }}
        />
      )}

      {aksiCpmk && (
        <ModalHapusItem
          key={`${aksiCpmk.tipe}-${aksiCpmk.item.id}`}
          judul={lepasCpmkMode ? `Lepas ${aksiCpmk.item.kode} dari mata kuliah?` : `Hapus ${aksiCpmk.item.kode}?`}
          memeriksa={aksiCpmk.dampak === null}
          blokir={
            !lepasCpmkMode && aksiCpmk.dampak && aksiCpmk.dampak.jumlahNilai > 0
              ? `CPMK ini masih punya ${aksiCpmk.dampak.jumlahNilai} nilai mahasiswa terkait. Lepas dari mata kuliah dulu, lalu hapus.`
              : null
          }
          labelHapus={lepasCpmkMode ? "Lepas dari MK" : "Hapus CPMK"}
          onTutup={() => setAksi(null)}
          onHapus={async () => {
            const hasil = lepasCpmkMode ? await lepasCPMK(aksiCpmk.item.id) : await hapusCPMK(aksiCpmk.item.id);
            if (!hasil.error) {
              setAksi(null);
              tampilToast(`${aksiCpmk.item.kode} ${lepasCpmkMode ? "dilepas dari mata kuliah" : "dihapus"}`);
            }
            return hasil;
          }}
        >
          {aksiCpmk.dampak && (
            <>
              <p>
                {lepasCpmkMode
                  ? "Kaitan CPMK ke mata kuliah terputus. "
                  : "CPMK dihapus permanen dan pemetaan ke CPL ikut terhapus. "}
                Sub-CPMK di dalamnya ({aksiCpmk.dampak.jumlahSub}) dilepas dari CPMK ini: yang tidak dipakai CPMK
                lain berdiri sendiri, yang masih dipakai CPMK lain tetap di sana.
              </p>
              {lepasCpmkMode && aksiCpmk.dampak.jumlahNilai > 0 && (
                <p>
                  {aksiCpmk.dampak.jumlahNilai} nilai mahasiswa tetap tersimpan. Hasil capaian dihitung ulang tanpa
                  CPMK ini.
                </p>
              )}
              {aksiCpmk.dampak.totalSetelah !== null && (
                <p className={aksiCpmk.dampak.totalSetelah === 100 ? "" : "font-semibold text-[#B45309]"}>
                  Total bobot MK akan menjadi {aksiCpmk.dampak.totalSetelah}%{" "}
                  {aksiCpmk.dampak.totalSetelah === 100 ? "(valid)" : "(tidak valid)"}.
                </p>
              )}
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
              {aksiHapusSub.dampak.lainDiTempatLain.length > 0
                ? ` Kaitan ke ${aksiHapusSub.dampak.lainDiTempatLain.join(", ")} ikut terputus.`
                : ""}
            </p>
          )}
        </ModalHapusItem>
      )}

      {aksiLepasSub && (
        <ModalHapusItem
          key={`lepas-sub-${aksiLepasSub.item.id}-${aksiLepasSub.cpmk.id}`}
          judul={`Lepas ${aksiLepasSub.item.kode} dari ${aksiLepasSub.cpmk.kode}?`}
          memeriksa={aksiLepasSub.dampak === null}
          blokir={null}
          labelHapus="Lepas dari CPMK"
          onTutup={() => setAksi(null)}
          onHapus={async () => {
            const hasil = await lepasSubCPMK(aksiLepasSub.item.id, aksiLepasSub.cpmk.id);
            if (!hasil.error) {
              setAksi(null);
              tampilToast(`${aksiLepasSub.item.kode} dilepas dari ${aksiLepasSub.cpmk.kode}`);
            }
            return hasil;
          }}
        >
          {aksiLepasSub.dampak && (
            <>
              <p>
                Kaitan {aksiLepasSub.item.kode} ke {aksiLepasSub.cpmk.kode} terputus (bobot{" "}
                {aksiLepasSub.dampak.bobot}% dilepas).
              </p>
              <p>
                {aksiLepasSub.dampak.lainDiMk.length > 0
                  ? `Sub-CPMK tetap dipakai di ${aksiLepasSub.dampak.lainDiMk.join(", ")}, jadi pemetaannya ke tugas dipertahankan.`
                  : "Pemetaannya ke tugas di mata kuliah ini ikut dilepas."}{" "}
                {aksiLepasSub.dampak.lainDiTempatLain.length > 0
                  ? `Masih terkait ke ${aksiLepasSub.dampak.lainDiTempatLain.join(", ")} di mata kuliah lain.`
                  : aksiLepasSub.dampak.lainDiMk.length === 0
                    ? "Sub-CPMK kembali berdiri sendiri."
                    : ""}
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