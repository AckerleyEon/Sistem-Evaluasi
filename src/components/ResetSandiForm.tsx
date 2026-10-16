"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetSandiDenganToken } from "@/lib/actions/auth";

export function ResetSandiForm({ token }: { token: string }) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("loading");
    const formData = new FormData(e.currentTarget);
    const hasil = await resetSandiDenganToken(token, formData);
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
          Kata Sandi Baru
        </label>
        <input
          name="sandiBaru"
          type="password"
          required
          minLength={6}
          className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
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
          className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Menyimpan…" : "Ubah Kata Sandi"}
      </button>
    </form>
  );
}