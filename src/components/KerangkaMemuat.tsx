// Kerangka sementara saat data halaman diambil, supaya navigasi tidak terlihat membeku.
export function KerangkaMemuat() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Memuat halaman…</span>
      <div className="animate-pulse space-y-3 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="h-5 w-48 rounded-md bg-[#E8ECF4]" />
        <div className="h-3.5 w-72 max-w-full rounded-md bg-[#EEF1F7]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse space-y-3 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
            <div className="h-3.5 w-24 rounded-md bg-[#EEF1F7]" />
            <div className="h-7 w-16 rounded-md bg-[#E8ECF4]" />
          </div>
        ))}
      </div>
      <div className="animate-pulse space-y-3 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-[#F1F4FA]" />
        ))}
      </div>
    </div>
  );
}
