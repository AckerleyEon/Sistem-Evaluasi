import Link from "next/link";

export default function TidakDitemukan() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-100 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[.06em] text-blue-600">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali alamatnya, atau kembali ke
          beranda.
        </p>
        <Link
          href="/"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
