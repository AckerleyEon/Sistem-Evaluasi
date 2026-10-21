"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const MENU = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/dosen", label: "Kelola Akun Dosen", icon: "users" },
  { href: "/admin/data-master/cpl", label: "Data Master CPL", icon: "shield" },
  { href: "/admin/data-master/mata-kuliah", label: "MK & Mahasiswa", icon: "book" },
  { href: "/admin/data-master/cpmk", label: "CPMK & Sub-CPMK", icon: "link" },
] as const;

function NavIcon({ name }: { name: (typeof MENU)[number]["icon"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "grid":
        return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "users":
        return <svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3S14.5 16 14.5 19" /><path d="M16 8.3a3 3 0 1 1 1.5 5.6" /><path d="M15.5 13.7c2.5.3 4.5 2.4 4.5 5.3" /></svg>;
    case "shield":
        return <svg {...common}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "book":
        return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></svg>;
    case "link":
        return <svg {...common}><path d="M9 15l6-6" /><path d="M8 7l1.5-1.5a4 4 0 0 1 5.7 5.7L14 12" /><path d="M16 17l-1.5 1.5a4 4 0 0 1-5.7-5.7L10 12" /></svg>;
  }
}

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const bodyOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}
      <nav
        aria-label="Menu utama"
        className={`fixed inset-y-0 left-0 z-40 flex w-65 flex-col bg-white shadow-[0_12px_36px_rgba(15,23,42,.12)] transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRight: "1px solid #E8EAEE" }}
      >
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8EAEE] bg-white p-1.5">
            <Image src="/logo-ee.png" alt="Logo" width={40} height={35} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-4.75 text-[#2F6BE8]">Teknik Elektro</p>
            <p className="text-xs leading-4 text-[#6B7280]">Sistem Evaluasi CPL</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup menu" className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2F6BE8] lg:hidden">
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <ul className="flex-1 space-y-1 px-3">
          {MENU.map((item) => {
            const aktif = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={aktif ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-[10px] px-3.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6BE8] ${
                    aktif
                      ? "bg-[#2F6BE8] text-white shadow-[0_4px_12px_rgba(47,107,232,.25)]"
                      : "text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-[#E8EAEE] px-3 py-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mb-3 flex h-11 w-full items-center gap-3 rounded-[10px] px-3.5 text-sm font-medium text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Keluar
          </button>

        </div>
      </nav>
    </>
  );
}