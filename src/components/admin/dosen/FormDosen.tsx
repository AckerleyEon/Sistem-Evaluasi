"use client";

import { useState } from "react";
import { createDosen } from "@/lib/actions/dosen";

type AkunBaru = { nama: string; nip: string; passwordSementara: string };

function kelasInput(adaError: boolean) {
  return `h-11 w-full rounded-[10px] bg-[#EEF3FD] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9AA4B2] ${
    adaError ? "ring-2 ring-[#DC2626]" : "focus:ring-2 focus:ring-[#2F6BE8]/40"
  }`;
}

export function FormDosen({ onBerhasil }: { onBerhasil: (pesan: string) => void }) {
  const [nama, setNama] = useState("");
  const [gelar, setGelar] = useState("");
  const [alias, setAlias] = useState("");
  const [nip, setNip] = useState("");
  const [errorNama, setErrorNama] = useState("");
  const [errorNip, setErrorNip] = useState("");
  const [errorUmum, setErrorUmum] = useState("");
  const [loading, setLoading] = useState(false);
  const [akunBaru, setAkunBaru] = useState<AkunBaru | null>(null);
  const [tersalin, setTersalin] = useState(false);

  function reset() {
    setNama("");
    setGelar("");
    setAlias("");
    setNip("");
    setErrorNama("");
    setErrorNip("");
    setErrorUmum("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorUmum("");

    let ada = false;
    if (!nama.trim()) {
      setErrorNama("Nama lengkap wajib diisi.");
      ada = true;
    }
    if (!/^\d{8,20}$/.test(nip.trim())) {
      setErrorNip("NIP harus berupa angka (8-20 digit).");
      ada = true;
    }
    if (ada) return;

    setLoading(true);
    const fd = new FormData();
    fd.set("nama", nama);
    fd.set("gelar", gelar);
    fd.set("alias", alias);
    fd.set("nip", nip);
    const hasil = await createDosen(fd);
    setLoading(false);

    if (hasil.error) {
      setErrorUmum(hasil.error);
      return;
    }

    const namaTersimpan = nama.trim();
    setAkunBaru({
      nama: namaTersimpan,
      nip: hasil.nip ?? nip.trim(),
      passwordSementara: hasil.passwordSementara ?? "",
    });
    setTersalin(false);
    onBerhasil(`Akun ${namaTersimpan} berhasil dibuat`);
    reset();
  }

  async function salinKredensial() {
    if (!akunBaru) return;
    try {
      await navigator.clipboard.writeText(
        `Username: ${akunBaru.nip}\nKata sandi sementara: ${akunBaru.passwordSementara}`
      );
      setTersalin(true);
    } catch {
      setTersalin(false);
    }
  }

  return (
    <div className="h-full rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <h2 className="text-lg font-bold leading-6 text-[#111827]">Tambah Akun Dosen</h2>
      <p className="mb-5 text-[13px] text-[#6B7280]">
        Isi informasi dosen baru sesuai data kepegawaian dan akses sistem.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="nama-dosen" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Nama Lengkap
          </label>
          <input
            id="nama-dosen"
            value={nama}
            onChange={(e) => {
              setNama(e.target.value);
              if (errorNama) setErrorNama("");
            }}
            placeholder="Masukkan nama lengkap dosen"
            className={kelasInput(!!errorNama)}
          />
          {errorNama && <p className="mt-1.5 text-xs text-[#DC2626]">{errorNama}</p>}
        </div>

        <div>
          <label htmlFor="gelar-dosen" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Gelar Akademik
          </label>
          <input
            id="gelar-dosen"
            value={gelar}
            onChange={(e) => setGelar(e.target.value)}
            placeholder="Contoh: S.T., M.T., Dr., Prof."
            className={kelasInput(false)}
          />
        </div>

        <div>
          <label htmlFor="alias-dosen" className="mb-2 block text-[13px] font-medium text-[#111827]">
            Alias pada data Excel (opsional)
          </label>
          <input
            id="alias-dosen"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Nama singkat yang biasa digunakan"
            className={kelasInput(false)}
          />
        </div>

        <div>
          <label htmlFor="nip-dosen" className="mb-2 block text-[13px] font-medium text-[#111827]">
            NIP
          </label>
          <input
            id="nip-dosen"
            value={nip}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => {
              setNip(e.target.value);
              if (errorNip) setErrorNip("");
            }}
            placeholder="Masukkan NIP dosen"
            className={kelasInput(!!errorNip)}
          />
          {errorNip ? (
            <p className="mt-1.5 text-xs text-[#DC2626]">{errorNip}</p>
          ) : (
            <p className="mt-1.5 text-xs text-[#6B7280]">NIP dipakai sebagai username login dosen.</p>
          )}
        </div>

        {errorUmum && <p className="text-xs font-medium text-[#DC2626]">{errorUmum}</p>}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={reset} className="h-12.5 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#2F6BE8]">
            Reset
          </button>
          <button type="submit" disabled={loading} className="h-12.5 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>

      {akunBaru && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-1 text-base font-bold text-[#111827]">Akun {akunBaru.nama} dibuat</h2>
            <p className="mb-4 text-[13px] text-[#6B7280]">
              Berikan kredensial ini kepada dosen. Kata sandi sementara hanya ditampilkan sekali dan tidak bisa
              dilihat lagi setelah jendela ini ditutup.
            </p>

            <dl className="mb-4 space-y-3 rounded-xl bg-[#EEF3FD] p-4 text-sm">
              <div>
                <dt className="text-xs text-[#6B7280]">Username (NIP)</dt>
                <dd className="font-mono font-semibold text-[#111827]">{akunBaru.nip}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Kata sandi sementara</dt>
                <dd className="font-mono text-lg font-semibold tracking-wider text-[#2F6BE8]">
                  {akunBaru.passwordSementara}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={salinKredensial} className="h-11 rounded-[10px] bg-[#EEF3FD] text-sm font-semibold text-[#2F6BE8]">
                {tersalin ? "Tersalin ✓" : "Salin"}
              </button>
              <button onClick={() => setAkunBaru(null)} className="h-11 rounded-[10px] bg-[#2F6BE8] text-sm font-semibold text-white">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}