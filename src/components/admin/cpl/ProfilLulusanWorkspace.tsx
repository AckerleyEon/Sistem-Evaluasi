"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProfilLulusan,
  deleteProfilLulusan,
  updateProfilLulusan,
} from "@/lib/actions/profil-lulusan";

type CplPilihan = { id: string; kode: string; deskripsi: string };
type ProfilLulusanItem = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  cplTerkait: { cplId: string; cpl: CplPilihan }[];
};

function FormProfilLulusan({
  kodeBerikutnya,
  kodeTerpakai,
  daftarCPL,
}: {
  kodeBerikutnya: string;
  kodeTerpakai: string[];
  daftarCPL: CplPilihan[];
}) {
  const router = useRouter();
  const [kode, setKode] = useState(kodeBerikutnya);
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setKode(kodeBerikutnya);
    setNama("");
    setDeskripsi("");
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (kodeTerpakai.includes(kode.trim().toUpperCase())) {
      setError(`Kode ${kode} sudah dipakai. Gunakan kode lain.`);
      return;
    }
    setLoading(true);
    try {
      const hasil = await createProfilLulusan(new FormData(event.currentTarget));
      if ("error" in hasil && typeof hasil.error === "string") {
        setError(hasil.error);
        return;
      }
      reset();
      router.refresh();
    } catch (galat) {
      setError(galat instanceof Error ? galat.message : "Profil Lulusan gagal disimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-fit flex-1 flex-col rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:overflow-y-auto">
      <h2 className="text-lg font-bold leading-6 text-[#111827]">Tambah Profil Lulusan</h2>
      <p className="mb-5 text-[13px] text-[#6B7280]">Pilih CPL penyusun; nilai PL dihitung sebagai rata-rata nilai CPL terpilih.</p>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
        <div>
          <label htmlFor="kode-pl" className="mb-2 block text-[13px] font-medium text-[#111827]">Kode PL</label>
          <input
            id="kode-pl"
            name="kode"
            value={kode}
            onChange={(event) => setKode(event.target.value.toUpperCase())}
            pattern="PL-[0-9]{2,3}"
            title="Format kode PL- diikuti 2-3 digit, contoh PL-01"
            required
            className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>
        <div>
          <label htmlFor="nama-pl" className="mb-2 block text-[13px] font-medium text-[#111827]">Nama Profil Lulusan</label>
          <input
            id="nama-pl"
            name="nama"
            value={nama}
            onChange={(event) => setNama(event.target.value.slice(0, 150))}
            maxLength={150}
            required
            placeholder="Contoh: Insinyur Perancang Sistem"
            className="h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="deskripsi-pl" className="text-[13px] font-medium text-[#111827]">Deskripsi</label>
            <span className="text-xs text-[#6B7280]">{deskripsi.length}/500</span>
          </div>
          <textarea
            id="deskripsi-pl"
            name="deskripsi"
            value={deskripsi}
            onChange={(event) => setDeskripsi(event.target.value.slice(0, 500))}
            maxLength={500}
            required
            placeholder="Jelaskan peran atau kompetensi lulusan."
            className="min-h-28 w-full resize-y rounded-[10px] bg-[#EEF3FD] p-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] focus:ring-2 focus:ring-[#2F6BE8]/40"
          />
        </div>
        <div className="flex min-h-28 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#111827]">CPL Penyusun</span>
            <span className="text-xs text-[#6B7280]">{daftarCPL.length} tersedia</span>
          </div>
          {daftarCPL.length ? (
            <div className="max-h-44 min-h-0 space-y-1 overflow-y-auto rounded-xl border border-[#E5E9F0] p-2 lg:max-h-none lg:flex-1">
              {daftarCPL.map((cpl) => (
                <label key={cpl.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-[#F8FAFC]">
                  <input type="checkbox" name="cplIds" value={cpl.id} className="mt-0.5 accent-[#2F6BE8]" />
                  <span><b className="text-[#2F6BE8]">{cpl.kode}</b><span className="ml-2 text-[#475569]">{cpl.deskripsi}</span></span>
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#FFFBEB] p-3 text-xs text-[#92400E]">Tambahkan CPL terlebih dahulu sebelum membuat Profil Lulusan.</p>
          )}
        </div>
        {error && <p role="alert" className="rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={reset} disabled={loading} className="h-12 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#2F6BE8] disabled:opacity-50">Reset</button>
          <button type="submit" disabled={loading || daftarCPL.length === 0} className="h-12 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalEditProfil({
  profil,
  daftarCPL,
  onTutup,
}: {
  profil: ProfilLulusanItem;
  daftarCPL: CplPilihan[];
  onTutup: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const hasil = await updateProfilLulusan(profil.id, new FormData(event.currentTarget));
      if ("error" in hasil && typeof hasil.error === "string") {
        setError(hasil.error);
        return;
      }
      onTutup();
      router.refresh();
    } catch (galat) {
      setError(galat instanceof Error ? galat.message : "Profil Lulusan gagal diperbarui.");
    } finally {
      setLoading(false);
    }
  }

  const cplTerpilih = new Set(profil.cplTerkait.map((relasi) => relasi.cplId));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-edit-pl" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onTutup();
    }}>
      <section className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="judul-edit-pl" className="text-lg font-bold text-[#111827]">Edit Profil Lulusan</h2>
        <p className="mb-4 text-xs text-[#64748B]">Perubahan pemetaan akan menghitung ulang nilai PL mahasiswa.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="edit-kode-pl" className="mb-1.5 block text-xs font-semibold">Kode PL</label>
            <input id="edit-kode-pl" name="kode" defaultValue={profil.kode} pattern="PL-[0-9]{2,3}" required className="h-10 w-full rounded-lg bg-[#EEF3FD] px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="edit-nama-pl" className="mb-1.5 block text-xs font-semibold">Nama Profil Lulusan</label>
            <input id="edit-nama-pl" name="nama" defaultValue={profil.nama} maxLength={150} required className="h-10 w-full rounded-lg bg-[#EEF3FD] px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="edit-deskripsi-pl" className="mb-1.5 block text-xs font-semibold">Deskripsi</label>
            <textarea id="edit-deskripsi-pl" name="deskripsi" defaultValue={profil.deskripsi} maxLength={500} required className="min-h-24 w-full rounded-lg bg-[#EEF3FD] p-3 text-sm" />
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold">CPL Penyusun (pilih minimal satu)</legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#E5E9F0] p-2">
              {daftarCPL.map((cpl) => (
                <label key={cpl.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-[#F8FAFC]">
                  <input type="checkbox" name="cplIds" value={cpl.id} defaultChecked={cplTerpilih.has(cpl.id)} className="mt-0.5 accent-[#2F6BE8]" />
                  <span><b className="text-[#2F6BE8]">{cpl.kode}</b><span className="ml-2 text-[#475569]">{cpl.deskripsi}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onTutup} disabled={loading} className="h-11 rounded-lg bg-[#EEF3FD] text-sm font-semibold text-[#475569]">Batal</button>
            <button type="submit" disabled={loading} className="h-11 rounded-lg bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50">{loading ? "Menyimpan…" : "Simpan Perubahan"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ProfilLulusanWorkspace({
  daftarCPL,
  daftarProfil,
  kodeBerikutnya,
}: {
  daftarCPL: CplPilihan[];
  daftarProfil: ProfilLulusanItem[];
  kodeBerikutnya: string;
}) {
  const [cari, setCari] = useState("");
  const [editTarget, setEditTarget] = useState<ProfilLulusanItem | null>(null);
  const [hapusTarget, setHapusTarget] = useState<ProfilLulusanItem | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const router = useRouter();

  const hasilCari = useMemo(() => {
    const kata = cari.trim().toLocaleLowerCase("id");
    if (!kata) return daftarProfil;
    return daftarProfil.filter((item) =>
      [item.kode, item.nama, item.deskripsi, ...item.cplTerkait.map(({ cpl }) => cpl.kode)]
        .some((teks) => teks.toLocaleLowerCase("id").includes(kata)),
    );
  }, [cari, daftarProfil]);

  async function hapusProfil() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      await deleteProfilLulusan(hapusTarget.id);
      setHapusTarget(null);
      router.refresh();
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[358px_minmax(0,1fr)] lg:items-stretch">
      <div className="lg:relative lg:min-h-155">
      <div className="flex flex-col gap-6 lg:absolute lg:inset-0">
        <div className="flex h-30 shrink-0 items-center gap-4 rounded-2xl bg-[#2F6BE8] p-6 text-white">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold leading-6">Total Profil Lulusan</p>
            <p className="flex items-baseline gap-1.5"><span className="text-2xl font-semibold">{daftarProfil.length}</span><span className="text-base">Profil</span></p>
          </div>
        </div>
        <FormProfilLulusan
          key={kodeBerikutnya}
          kodeBerikutnya={kodeBerikutnya}
          kodeTerpakai={daftarProfil.map((item) => item.kode)}
          daftarCPL={daftarCPL}
        />
      </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="border-b border-[#E8EAEE] p-5">
          <div className="relative w-full max-w-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
            </svg>
            <input value={cari} onChange={(event) => setCari(event.target.value)} placeholder="Cari kode PL, nama, atau CPL" className="h-11 w-full rounded-full bg-[#F1F3F5] pl-11 pr-9 text-sm outline-none focus:ring-2 focus:ring-[#2F6BE8]/30" />
          </div>
        </div>
        <div className="sticky top-0 z-10 grid grid-cols-[90px_minmax(170px,1fr)_minmax(150px,1fr)_88px] gap-3 border-b border-[#E8EAEE] bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-6 sm:text-xs">
          <span>Kode</span><span>Profil Lulusan</span><span>CPL Penyusun</span><span className="text-center">Aksi</span>
        </div>
        <div className="h-full overflow-y-auto">
          {hasilCari.length ? hasilCari.map((item) => (
            <div key={item.id} className="grid grid-cols-[90px_minmax(170px,1fr)_minmax(150px,1fr)_88px] items-center gap-3 border-b border-[#E8EAEE] px-5 py-5 sm:px-6">
              <span className="text-sm font-bold text-[#2F6BE8]">{item.kode}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827]">{item.nama}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{item.deskripsi}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.cplTerkait.map(({ cpl }) => <span key={cpl.id} className="rounded-full bg-[#EEF3FD] px-2 py-1 text-[10px] font-semibold text-[#2F6BE8]">{cpl.kode}</span>)}
              </div>
              <div className="flex justify-center gap-1">
                <button type="button" onClick={() => setEditTarget(item)} aria-label={`Edit ${item.kode}`} title="Edit Profil Lulusan" className="grid h-9 w-9 place-items-center rounded-lg text-[#475569] hover:bg-[#EEF3FD]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button type="button" onClick={() => setHapusTarget(item)} aria-label={`Hapus ${item.kode}`} title="Hapus Profil Lulusan" className="grid h-9 w-9 place-items-center rounded-lg text-[#475569] hover:bg-[#FEE2E2] hover:text-[#DC2626]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              </div>
            </div>
          )) : (
            <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
              {cari ? `Tidak ada Profil Lulusan yang cocok dengan "${cari}".` : "Belum ada Profil Lulusan untuk ditampilkan."}
            </div>
          )}
        </div>
        <div className="flex h-11 items-center gap-2 bg-[#EEF3FD] px-6 text-xs text-[#111827]">
          <span className="text-[#2F6BE8]">ⓘ</span>
          Menampilkan {hasilCari.length} dari {daftarProfil.length} Profil Lulusan · nilai dihitung dari rata-rata CPL yang dipetakan
        </div>
      </div>

      {editTarget && <ModalEditProfil key={editTarget.id} profil={editTarget} daftarCPL={daftarCPL} onTutup={() => setEditTarget(null)} />}
      {hapusTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-hapus-pl">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 id="judul-hapus-pl" className="mb-2 text-base font-bold text-[#111827]">Hapus {hapusTarget.kode}?</h2>
            <p className="mb-5 text-sm text-[#6B7280]">Profil Lulusan dan hasil perhitungan PL mahasiswa akan dihapus. Nilai CPL tetap tersimpan.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setHapusTarget(null)} disabled={menghapus} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827]">Batal</button>
              <button type="button" onClick={hapusProfil} disabled={menghapus} className="h-11 rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-60">{menghapus ? "Menghapus…" : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
