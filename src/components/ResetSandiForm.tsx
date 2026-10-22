"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetSandiDenganToken } from "@/lib/actions/auth";
import { FieldSandi } from "@/components/FieldSandi";
import { MIN_SANDI } from "@/lib/sandi";

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
      <FieldSandi
        id="sandiBaru"
        name="sandiBaru"
        label="Kata Sandi Baru"
        petunjuk={`Minimal ${MIN_SANDI} karakter.`}
        autoFocus
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
        {status === "loading" ? "Menyimpan…" : "Ubah Kata Sandi"}
      </button>
    </form>
  );
}
