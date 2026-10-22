"use client";

import { GalatHalaman } from "@/components/GalatHalaman";

export default function GalatAdmin({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <GalatHalaman error={error} reset={reset} berandaHref="/admin" />;
}
