"use client";

import { useState } from "react";
import { buatTautanResetUntukDosen } from "@/lib/actions/auth";

export function TombolBuatTautan({ permintaanId }: { permintaanId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const hasil = await buatTautanResetUntukDosen(permintaanId);
    setLoading(false);
    if (hasil.link) setLink(hasil.link);
  }

  if (link) {
    return (
      <span className="text-xs">
        Salin &amp; kirim manual:{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">{window.location.origin}{link}</code>
      </span>
    );
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-blue-600 text-sm underline disabled:opacity-50">
      {loading ? "Membuat…" : "Buatkan Tautan Reset"}
    </button>
  );
}