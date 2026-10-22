"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetSandiDenganOtp } from "@/lib/actions/auth";
import { FieldSandi } from "@/components/FieldSandi";
import { MIN_SANDI } from "@/lib/sandi";

const kelasInput =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15";
const kelasLabel = "mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700";

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
    return (
      <div role="status" className="space-y-3 text-sm text-slate-600">
        <p>Kata sandi berhasil diubah. Mengalihkan ke halaman login…</p>
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Langsung ke halaman login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className={kelasLabel}>
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={username}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={kelasInput}
        />
      </div>
      <div>
        <label htmlFor="kodeOtp" className={kelasLabel}>
          Kode OTP
        </label>
        <input
          id="kodeOtp"
          name="kodeOtp"
          required
          maxLength={6}
          minLength={6}
          pattern="\d{6}"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={!!username}
          placeholder="6 digit dari email"
          className={`${kelasInput} text-center font-mono text-lg tracking-[.3em]`}
        />
        <p className="mt-1.5 text-xs text-slate-500">Kode berlaku 10 menit sejak email dikirim.</p>
      </div>
      <FieldSandi
        id="sandiBaru"
        name="sandiBaru"
        label="Kata Sandi Baru"
        petunjuk={`Minimal ${MIN_SANDI} karakter.`}
      />
      <FieldSandi id="konfirmasi" name="konfirmasi" label="Konfirmasi Kata Sandi" />
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Memverifikasi…" : "Verifikasi & Ubah Kata Sandi"}
      </button>
      <p className="text-center text-sm text-slate-500">
        Belum menerima kode?{" "}
        <Link href="/lupa-sandi" className="font-semibold text-blue-600 hover:underline">
          Minta kode baru
        </Link>
      </p>
    </form>
  );
}

export default function ResetOtpPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4 py-10">
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
