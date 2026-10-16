"use client";

import { useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DosenSidebar } from "./DosenSidebar";
import { DosenTopbar } from "./DosenTopbar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pjs",
});

export function DosenShell({
  nama,
  nip,
  labelTA,
  children,
}: {
  nama: string;
  nip: string;
  labelTA: string | null;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={`${plusJakarta.variable} flex min-h-dvh bg-[#F3F4F6] font-[family-name:var(--font-pjs)]`}>
      <DosenSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DosenTopbar nama={nama} nip={nip} labelTA={labelTA} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
