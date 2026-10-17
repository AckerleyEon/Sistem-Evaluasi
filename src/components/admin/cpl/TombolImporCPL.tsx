"use client";

import { useState } from "react";
import { ModalImporCPL } from "./ModalImporCPL";

export function TombolImporCPL() {
  const [imporTerbuka, setImporTerbuka] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setImporTerbuka(true)}
        className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-[#EEF3FD] px-5 text-sm font-semibold text-[#2F6BE8] [@media(hover:hover)]:hover:bg-[#DCE7FB]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        Impor dari Excel
      </button>
      {imporTerbuka && <ModalImporCPL onTutup={() => setImporTerbuka(false)} />}
    </>
  );
}
