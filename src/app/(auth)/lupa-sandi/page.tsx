"use client";

import { useState } from "react";
import Link from "next/link";
import { mintaResetSandi } from "@/lib/actions/auth";

export default function LupaSandiPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [username, setUsername] = useState("");
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

    setStatus("done");
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-100 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Lupa Kata Sandi</h1>

        {status !== "done" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              Masukkan username akun Anda. Dosen akan diarahkan ke Admin Program Studi; Admin akan menerima
              kode OTP lewat email terverifikasi.
            </p>
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
              />
            </div>
            {errorMsg && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading" || username.trim() === ""}
              className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white disabled:opacity-60"
            >
              {status === "loading" ? "Memproses…" : "Kirim Permintaan"}
            </button>
            <p className="text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                Kembali ke halaman login
              </Link>
            </p>
          </form>
        ) : (
          <div role="status" className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Jika username tersebut terdaftar, permintaan Anda sudah diproses sesuai perannya:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-semibold text-slate-800">Dosen:</strong> permintaan diteruskan ke Admin
                Program Studi, yang akan mengirimkan tautan reset kepada Anda.
              </li>
              <li>
                <strong className="font-semibold text-slate-800">Admin:</strong> kode OTP dikirim ke email
                terverifikasi dan berlaku 10 menit.
              </li>
            </ul>
            <Link
              href={`/reset-sandi/otp?username=${encodeURIComponent(username.trim())}`}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
            >
              Saya sudah punya kode OTP
            </Link>
            <p className="text-center">
              <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                Kembali ke halaman login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
