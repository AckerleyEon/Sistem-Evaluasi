"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  analisisImporDosen,
  terapkanImporDosen,
  type BarisImporDosen,
  type KredensialDosen,
} from "@/lib/actions/dosen";

type Analisis = {
  baris: BarisImporDosen[];
  baru: number;
  sudahAda: number;
  akanDihapus: { nama: string; gelar: string | null; nip: string; penugasan: string[] }[];
};

export function ModalImporDosen({
  onTutup,
  onBerhasil,
}: {
  onTutup: () => void;
  onBerhasil: (pesan: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [kredensial, setKredensial] = useState<KredensialDosen[] | null>(null);
  const [hapusTidakAda, setHapusTidakAda] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const [fileNama, setFileNama] = useState("");

  async function periksaFile() {
    const file = inputRef.current?.files?.[0];
    setError("");
    setAnalisis(null);
    setKredensial(null);
    if (!file) {
      setError("Pilih file template yang sudah diisi.");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("file", file);
    const hasil = await analisisImporDosen(fd);
    setLoading(false);
    if (!hasil.ok) {
      setError(hasil.error);
      return;
    }
    setFileNama(file.name);
    setAnalisis({
      baris: hasil.baris,
      baru: hasil.baru,
      sudahAda: hasil.sudahAda,
      akanDihapus: hasil.akanDihapus,
    });
  }

  async function terapkan() {
    if (!analisis) return;
    if (
      hapusTidakAda &&
      analisis.akanDihapus.length > 0 &&
      !window.confirm(
        `Hapus ${analisis.akanDihapus.length} akun dosen yang tidak ada di file? Penugasan mata kuliah mereka akan dilepas.`
      )
    ) {
      return;
    }

    setError("");
    setLoading(true);
    const hasil = await terapkanImporDosen(analisis.baris, hapusTidakAda);
    setLoading(false);
    if (!hasil.ok) {
      setError(hasil.error);
      return;
    }
    setKredensial(hasil.dibuat);
    onBerhasil(
      `Impor selesai: ${hasil.dibuat.length} akun baru, ${hasil.dilewati} NIP dilewati, ${hasil.dihapus} akun dihapus.`
    );
    router.refresh();
  }

  async function salinSemua() {
    if (!kredensial) return;
    try {
      const teks = ["Nama\tNIP/Username\tKata sandi sementara", ...kredensial.map((d) => `${d.nama}\t${d.nip}\t${d.passwordSementara}`)].join("\n");
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
    } catch {
      setError("Tidak dapat menyalin ke clipboard. Pilih dan salin tabel secara manual.");
      setTersalin(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-impor-dosen"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onTutup();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !loading) onTutup();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="judul-impor-dosen" className="text-base font-bold text-[#111827]">
              {kredensial ? "Impor akun dosen selesai" : "Impor Akun Dosen dari Excel"}
            </h2>
            {!kredensial && (
              <p className="mt-1 text-[13px] text-[#6B7280]">
                <a href="/api/admin/dosen/template" download className="font-semibold text-[#2F6BE8] hover:underline">
                  Unduh template Excel
                </a>
                {" · "}Isi kolom Nama, Gelar (opsional), dan NIP. NIP harus disimpan sebagai teks.
              </p>
            )}
          </div>
          <button type="button" onClick={onTutup} disabled={loading} aria-label="Tutup" className="rounded-full bg-[#F1F3F5] px-3 py-1.5 text-sm text-[#4B5563] disabled:opacity-50">
            ✕
          </button>
        </div>

        {kredensial ? (
          <>
            {kredensial.length > 0 ? (
              <>
                <p className="mt-3 rounded-lg bg-[#FEF3C7] px-3 py-2 text-sm text-[#92400E]">
                  Simpan kredensial ini sekarang. Kata sandi sementara hanya ditampilkan pada proses impor ini.
                </p>
                <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[#E8EAEE]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#F8FAFC] text-[#6B7280]">
                      <tr>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">NIP / Username</th>
                        <th className="px-3 py-2">Kata sandi sementara</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kredensial.map((d) => (
                        <tr key={d.nip} className="border-t border-[#F1F3F5]">
                          <td className="px-3 py-2">{d.nama}</td>
                          <td className="px-3 py-2 font-mono">{d.nip}</td>
                          <td className="px-3 py-2 font-mono font-semibold">{d.passwordSementara}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={salinSemua} className="mt-3 h-10 self-start rounded-[10px] bg-[#EEF3FD] px-4 text-sm font-semibold text-[#2F6BE8]">
                  {tersalin ? "Semua kredensial tersalin ✓" : "Salin semua kredensial"}
                </button>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-[#DCFCE7] px-3 py-3 text-sm text-[#166534]">
                Impor berhasil. Tidak ada akun baru yang dibuat sehingga tidak ada kata sandi untuk ditampilkan.
              </p>
            )}
            {error && <p role="alert" className="mt-3 text-xs text-[#DC2626]">{error}</p>}
            <button type="button" onClick={onTutup} className="mt-4 h-11 self-end rounded-[10px] bg-[#2F6BE8] px-6 text-sm font-semibold text-white">
              Selesai
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                onChange={() => {
                  setAnalisis(null);
                  setError("");
                }}
                aria-label="Pilih file Excel dosen"
                className="block min-w-0 flex-1 text-sm text-[#111827] file:mr-3 file:h-10 file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-sm file:font-semibold file:text-[#111827]"
              />
              <button type="button" onClick={periksaFile} disabled={loading} className="h-10 rounded-[10px] bg-[#2F6BE8] px-4 text-sm font-semibold text-white disabled:opacity-50">
                {loading ? "Memeriksa…" : "Periksa file"}
              </button>
            </div>

            {analisis && (
              <>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <p className="rounded-lg bg-[#DCFCE7] px-3 py-2 text-[#166534]">{analisis.baru} akun baru</p>
                  <p className="rounded-lg bg-[#DCE7FB] px-3 py-2 text-[#1D4ED8]">{analisis.sudahAda} NIP sudah terdaftar (dilewati)</p>
                  <p className="rounded-lg bg-[#F1F3F5] px-3 py-2 text-[#4B5563]">{analisis.baris.length} baris valid · {fileNama}</p>
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#7F1D1D]">
                  <input type="checkbox" checked={hapusTidakAda} onChange={(e) => setHapusTidakAda(e.target.checked)} className="mt-0.5" />
                  <span>
                    <span className="block font-semibold">Hapus akun dosen yang tidak ada di file ({analisis.akanDihapus.length})</span>
                    Penghapusan dibatalkan bila dosen tersebut masih mengampu kelas.
                  </span>
                </label>
                {hapusTidakAda && analisis.akanDihapus.length > 0 && (
                  <div className="mt-3 max-h-36 overflow-auto rounded-lg border border-[#FECACA] p-3 text-xs text-[#4B5563]">
                    {analisis.akanDihapus.map((d) => (
                      <p key={d.nip} className="py-1">
                        <span className="font-semibold">{d.nama} ({d.nip})</span>
                        {d.penugasan.length > 0 ? ` — penugasan dilepas: ${d.penugasan.join(", ")}` : " — tidak memiliki penugasan"}
                      </p>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-[#6B7280]">
                  NIP yang sudah ada tidak memperbarui data dosen. Password sementara dibuat otomatis untuk akun baru.
                </p>
              </>
            )}

            {error && <p role="alert" className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">{error}</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onTutup} disabled={loading} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#111827] disabled:opacity-50">
                Batal
              </button>
              <button type="button" onClick={terapkan} disabled={!analisis || loading} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-50">
                {loading ? "Menyimpan…" : "Impor data"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
