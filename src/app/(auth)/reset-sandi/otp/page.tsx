"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetSandiDenganOtp } from "@/lib/actions/auth";

function FormOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username] = useState(searchParams.get("username") ?? "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("loading");
    const formData = new FormData(e.currentTarget);
    const hasil = await resetSandiDenganOtp(formData);
    if (hasil.error) {
      setStatus("idle");
      setError(hasil.error);
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/login"), 2000);
  }

  if (status === "done") {
    return <p className="text-sm text-slate-600">Kata sandi berhasil diubah. Mengalihkan ke halaman login…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
          Username
        </label>
        <input
          name="username"
          defaultValue={username}
          required
          className="h-12 w-full text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 px-3.5 text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
          Kode OTP
        </label>
        <input
          name="kodeOtp"
          required
          maxLength={6}
          inputMode="numeric"
          placeholder="6 digit dari email"
          className="h-12 w-full text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 px-3.5 text-center font-mono text-lg tracking-[.3em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
          Kata Sandi Baru
        </label>
        <input
          name="sandiBaru"
          type="password"
          required
          minLength={6}
          className="h-12 w-full text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 px-3.5 text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
          Konfirmasi Kata Sandi
        </label>
        <input
          name="konfirmasi"
          type="password"
          required
          minLength={6}
          className="h-12 w-full text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 px-3.5 text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Memverifikasi…" : "Verifikasi & Ubah Kata Sandi"}
      </button>
    </form>
  );
}

export default function ResetOtpPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-100 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Masukkan Kode OTP</h1>
        <p className="mb-6 text-sm text-slate-500">Cek email Anda untuk kode verifikasi 6 digit.</p>
        <Suspense fallback={null}>
          <FormOtp />
        </Suspense>
      </div>
    </div>
  );
}