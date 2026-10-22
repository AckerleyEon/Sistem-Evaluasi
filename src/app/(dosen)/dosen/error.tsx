"use client";

import { GalatHalaman } from "@/components/GalatHalaman";

export default function GalatDosen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <GalatHalaman error={error} reset={reset} berandaHref="/dosen" />;
}
