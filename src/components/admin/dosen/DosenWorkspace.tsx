"use client";

import { useRef, useState } from "react";
import { cekPenugasanDosen } from "@/lib/actions/dosen";
import { FormDosen } from "./FormDosen";
import { DaftarDosen } from "./DaftarDosen";
import { ModalEditDosen } from "./ModalEditDosen";
import { ModalGantiSandi } from "./ModalGantiSandi";
import { ModalHapusDosen } from "./ModalHapusDosen";
import { ModalImporDosen } from "./ModalImporDosen";
import { useRouter } from "next/navigation";

export type DosenItem = {
  id: string;
  nama: string;
  gelar: string | null;
  nip: string;
};

export function DosenWorkspace({
  total,
  mengampu,
  daftar,
  q,
  page,
  totalHalaman,
  totalHasil,
  pageSize,
}: {
  total: number;
  mengampu: number;
  daftar: DosenItem[];
  q: string;
  page: number;
  totalHalaman: number;
  totalHasil: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [imporTerbuka, setImporTerbuka] = useState(false);
  const [editTarget, setEditTarget] = useState<DosenItem | null>(null);
  const [gantiSandiTarget, setGantiSandiTarget] = useState<DosenItem | null>(null);
  const [hapusTarget, setHapusTarget] = useState<DosenItem | null>(null);
  const [hasilCek, setHasilCek] = useState<{ id: string; daftar: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tampilToast(pesan: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(pesan);
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function bukaHapus(d: DosenItem) {
    setHapusTarget(d);
    setHasilCek(null);
    const penugasan = await cekPenugasanDosen(d.id);
    setHasilCek({ id: d.id, daftar: penugasan });
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div role="status" className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-medium text-white shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold leading-6.5 text-[#111827]">Kelola Akun Dosen</h1>
          <p className="text-[13px] text-[#6B7280]">Daftar akun pengampu mata kuliah</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImporTerbuka(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#EEF3FD] px-5 text-sm font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
          >
            Impor dari Excel
          </button>
          <a
            href="/api/admin/dosen/export"
            download
            className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#2F6BE8] px-6 text-[15px] font-semibold text-white [@media(hover:hover)]:hover:bg-[#2459C7]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M5 19h14" />
            </svg>
            Ekspor Data
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[358px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between rounded-2xl bg-[#2F6BE8] p-5 text-white">
            <div>
              <p className="text-xs font-semibold tracking-[.06em] text-white/80">TOTAL DOSEN</p>
              <p className="text-[32px] font-bold leading-10">{total}</p>
              <p className="text-xs text-white/80">{mengampu} Mengampu MK</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F6BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 13h18" />
              </svg>
            </div>
          </div>

          <FormDosen onBerhasil={tampilToast} />
        </div>

        <DaftarDosen
          daftar={daftar}
          total={total}
          q={q}
          page={page}
          totalHalaman={totalHalaman}
          totalHasil={totalHasil}
          pageSize={pageSize}
          onEdit={setEditTarget}
          onHapus={bukaHapus}
          onGantiSandi={setGantiSandiTarget}
        />
      </div>

      {editTarget && (
        <ModalEditDosen
          key={editTarget.id}
          dosen={editTarget}
          onTutup={() => setEditTarget(null)}
          onBerhasil={tampilToast}
        />
      )}

      {gantiSandiTarget && (
        <ModalGantiSandi
          key={gantiSandiTarget.id}
          dosen={gantiSandiTarget}
          onTutup={() => setGantiSandiTarget(null)}
          onBerhasil={tampilToast}
        />
      )}

      {hapusTarget && (
        <ModalHapusDosen
          key={hapusTarget.id}
          dosen={hapusTarget}
          penugasan={hasilCek?.id === hapusTarget.id ? hasilCek.daftar : null}
          onTutup={() => setHapusTarget(null)}
          onBerhasil={tampilToast}
        />
      )}

      {imporTerbuka && (
        <ModalImporDosen
          onTutup={() => setImporTerbuka(false)}
          onBerhasil={(pesan) => {
            tampilToast(pesan);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}