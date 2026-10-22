"use client";

import { useState } from "react";
import { MAKS_SANDI, MIN_SANDI } from "@/lib/sandi";

type Props = {
  id: string;
  name: string;
  label: string;
  autoComplete?: "new-password" | "current-password";
  petunjuk?: string;
  autoFocus?: boolean;
};

export function FieldSandi({ id, name, label, autoComplete = "new-password", petunjuk, autoFocus }: Props) {
  const [tampil, setTampil] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={tampil ? "text" : "password"}
          required
          minLength={MIN_SANDI}
          maxLength={MAKS_SANDI}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-describedby={petunjuk ? `${id}-petunjuk` : undefined}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 text-base text-slate-900 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
        />
        <button
          type="button"
          onClick={() => setTampil((v) => !v)}
          aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={tampil}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {tampil ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6 0 9.5 6 9.5 8a11.4 11.4 0 0 1-3.1 3.9M6.6 6.6C4 8.3 2.5 10.9 2.5 12c0 2 3.5 8 9.5 8 1.1 0 2.1-.2 3-.5" />
              </>
            ) : (
              <>
                <path d="M2.5 12S6 4 12 4s9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {petunjuk && (
        <p id={`${id}-petunjuk`} className="mt-1.5 text-xs text-slate-500">
          {petunjuk}
        </p>
      )}
    </div>
  );
}
