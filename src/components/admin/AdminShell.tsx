"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type TahunAjaranItem = { id: string; label: string; status: "AKTIF" | "ARSIP" };

export function AdminShell({
  username,
  daftarTahunAjaran,
  children,
}: {
  username: string;
  daftarTahunAjaran: TahunAjaranItem[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-[#F4F6FB] font-(family-name:--font-pjs)">
      <a href="#konten-utama" className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1D4ED8] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Lewati ke konten utama
      </a>
      <AdminSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar username={username} daftarTahunAjaran={daftarTahunAjaran} onMenuClick={() => setDrawerOpen(true)} />
        <main id="konten-utama" className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}