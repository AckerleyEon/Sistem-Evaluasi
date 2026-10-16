"use client";

import { useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pjs",
});

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
    <div className={`${plusJakarta.variable} flex min-h-dvh bg-[#F3F4F6] font-(family-name:--font-pjs)`}>
      <AdminSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar username={username} daftarTahunAjaran={daftarTahunAjaran} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}