"use client";

export function ModalShell({
  children,
  onTutup,
  lebar = "max-w-md",
  alert = false,
}: {
  children: React.ReactNode;
  onTutup: () => void;
  lebar?: string;
  alert?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role={alert ? "alertdialog" : "dialog"}
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onTutup();
      }}
    >
      <div className={`max-h-[90dvh] w-full ${lebar} overflow-y-auto rounded-2xl bg-white p-6`}>{children}</div>
    </div>
  );
}