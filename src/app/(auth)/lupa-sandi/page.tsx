"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mintaResetSandi } from "@/lib/actions/auth";

type Mode = "tidak-ditemukan" | "diteruskan-ke-admin" | "otp-terkirim";

export default function LupaSandiPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const hasil = await mintaResetSandi(formData);

    if ("error" in hasil && hasil.error) {
      setStatus("idle");
      setErrorMsg(hasil.error);
      return;
    }

    if (hasil.mode === "otp-terkirim") {
      setTimeout(() => {
        router.push(`/reset-sandi/otp?username=${encodeURIComponent(hasil.username ?? "")}`);
      }, 1500);
    }

    setMode(hasil.mode as Mode);
    setStatus("done");
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-100 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Lupa Kata Sandi</h1>

        {status !== "done" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              Masukkan username akun Anda. Dosen akan diarahkan ke Admin Program Studi; Admin akan menerima
              kode OTP lewat email terverifikasi.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
                Username
              </label>
              <input
                name="username"
                required
                className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
              />
            </div>
            {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white disabled:opacity-60"
            >
              {status === "loading" ? "Memproses…" : "Kirim Permintaan"}
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            {mode === "diteruskan-ke-admin" && (
              <p>Permintaan reset kata sandi Anda telah diteruskan ke Admin Program Studi.</p>
            )}
            {mode === "otp-terkirim" && <p>Kode OTP telah dikirim. Mengalihkan ke halaman verifikasi…</p>}
            {mode === "tidak-ditemukan" && (
              <p>Jika akun dengan username tersebut terdaftar, proses reset telah dijalankan sesuai perannya.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}