"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, getSession } from "next-auth/react";

type Peran = "dosen" | "admin";

const SALINAN: Record<
  Peran,
  { chip: string; subteks: string; labelField: string; placeholder: string; teksBantu: string }
> = {
  dosen: {
    chip: "Portal Dosen & Koordinator",
    subteks: "Masuk dengan NIP/Username untuk mengelola tugas dan asesmen kurikulum CPL.",
    labelField: "NIP / Username",
    placeholder: "18 digit NIP atau username",
    teksBantu: "Gunakan akun NIP / Username Dosen yang terdaftar.",
  },
  admin: {
    chip: "Portal Administrator Prodi",
    subteks: "Masuk dengan Username Administrator untuk memantau dan mengatur kurikulum.",
    labelField: "Username",
    placeholder: "Username administrator",
    teksBantu: "Gunakan akun Administrator Prodi yang terdaftar.",
  },
};

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconEye({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6 0 9.5 6 9.5 8a11.4 11.4 0 0 1-3.1 3.9M6.6 6.6C4 8.3 2.5 10.9 2.5 12c0 2 3.5 8 9.5 8 1.1 0 2.1-.2 3-.5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 4 12 4s9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [peran, setPeran] = useState<Peran>("dosen");
  const [identitas, setIdentitas] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [tampilSandi, setTampilSandi] = useState(false);
  const [capsLockAktif, setCapsLockAktif] = useState(false);

  const [errorIdentitas, setErrorIdentitas] = useState("");
  const [errorSandi, setErrorSandi] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const [ringkasan, setRingkasan] = useState<{ rataCapaianCpl: number; persenMatriksTerpetakan: number } | null>(null);
  const [statusServer, setStatusServer] = useState<"memuat" | "ok" | "gangguan">("memuat");

  const identitasRef = useRef<HTMLInputElement>(null);
  const s = SALINAN[peran];
  const siap = identitas.trim() !== "" && kataSandi !== "" && status === "idle";

  useEffect(() => {
    fetch("/api/public/ringkasan")
      .then((r) => r.json())
      .then(setRingkasan)
      .catch(() => setRingkasan(null));

    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setStatusServer(d.status === "ok" ? "ok" : "gangguan"))
      .catch(() => setStatusServer("gangguan"));
  }, []);

  function gantiTab(p: Peran) {
    setPeran(p);
    setKataSandi("");
    setErrorBanner("");
    setErrorIdentitas("");
    setErrorSandi("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorBanner("");

    const idTrim = identitas.trim();
    let ada = false;
    if (idTrim === "") {
      setErrorIdentitas("NIP/Username wajib diisi.");
      ada = true;
    }
    if (kataSandi === "") {
      setErrorSandi("Kata sandi wajib diisi.");
      ada = true;
    }
    if (ada) {
      identitasRef.current?.focus();
      return;
    }

    setStatus("loading");

    const hasil = await signIn("credentials", {
      username: idTrim,
      password: kataSandi,
      redirect: false,
    });

    if (hasil?.error) {
      setStatus("idle");
      setErrorBanner("NIP/Username atau kata sandi salah. Periksa kembali lalu coba lagi.");
      setKataSandi("");
      identitasRef.current?.focus();
      return;
    }

    const session = await getSession();
    const roleAsli = session?.user?.role;
    const roleDiharapkan = peran === "admin" ? "ADMIN" : "DOSEN";

    if (roleAsli !== roleDiharapkan) {
      await signOut({ redirect: false });
      setStatus("idle");
      setErrorBanner(
        `Akun ini terdaftar sebagai ${roleAsli === "ADMIN" ? "Administrator" : "Dosen"}. Pilih tab "${
          roleAsli === "ADMIN" ? "Admin" : "Dosen"
        }" untuk masuk.`
      );
      setKataSandi("");
      return;
    }

    setStatus("success");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
      {/* PANEL KIRI */}
      <div className="relative hidden flex-col overflow-hidden bg-linear-to-br from-[#F8FAFF] to-[#EAF1FD] px-8 pb-10 pt-14 lg:flex lg:px-16 lg:pb-10 lg:pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(420px 420px at 70% 55%, rgba(47,107,234,.10), transparent 70%)",
          }}
        />
        <div className="relative z-10 flex max-w-140 flex-1 flex-col">
          <a href="#" target="_blank" rel="noreferrer" className="mb-14 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <Image src="/logo-ee.png" alt="Logo Teknik Elektro UTM" width={64} height={56} className="h-full w-full object-contain" />
              </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5.5 items-center rounded-full border border-blue-600/25 bg-blue-100 px-2.5 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Prodi EE &bull; UTM
                </span>
                <span className="text-xs text-slate-500">Universitas Trunojoyo Madura</span>
              </div>
              <p className="mt-1 text-[22px] leading-7">
                <span className="font-bold text-slate-900">Teknik Elektro</span>
                <span className="mx-3 inline-block h-5 w-px align-middle bg-slate-200" />
                <span className="font-normal text-slate-900">Sistem Evaluasi CPL</span>
              </p>
            </div>
          </a>

          <span className="mb-6 inline-flex h-8 w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-green-600" />
            Standar Kurikulum OBE
          </span>

          <p className="mb-5 text-[48px] font-bold leading-13.5 text-slate-900">
            <span className="block">Transformasi Evaluasi</span>
            <span className="block">Kurikulum Berbasis</span>
            <span className="block whitespace-nowrap text-blue-600">Outcome-Based Education</span>
          </p>

          <p className="mb-8 max-w-130 text-lg leading-7 text-slate-600">
            Platform otomasi asesmen ketercapaian <strong className="font-bold">CPL &amp; CPMK</strong> secara
            real-time, akurat, dan terintegrasi langsung dengan pemetaan portofolio mata kuliah mahasiswa.
          </p>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <IconArrowRight />
              </div>
              <span className="text-[28px] font-bold leading-8 text-slate-900">
                {ringkasan ? `${ringkasan.rataCapaianCpl}%` : "—"}
              </span>
              <p className="mt-1 text-[13px] text-slate-500">Rata-rata Ketercapaian CPL</p>
              {ringkasan && (
                <div className="mt-2 h-1 rounded-full bg-blue-100">
                  <div className="h-1 rounded-full bg-blue-600" style={{ width: `${ringkasan.rataCapaianCpl}%` }} />
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <IconBuilding />
              </div>
              <span className="text-[28px] font-bold leading-8 text-slate-900">
                {ringkasan ? `${ringkasan.persenMatriksTerpetakan}%` : "—"}
              </span>
              <p className="mt-1 text-[13px] text-slate-500">Otomasi Rekap Nilai &amp; Bobot</p>
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-white px-4.5 py-3.5">
            <span className="text-lg leading-none text-blue-600">&ldquo;</span>
            <span className="text-[13px] italic text-slate-600">
              {" "}Memangkas waktu rekap penilaian semester dan distribusi CPMK dari 2 pekan menjadi hitungan menit.
            </span>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-slate-200 pt-6">
            <span
              className={`h-2 w-2 rounded-full ${
                statusServer === "ok" ? "bg-green-600" : statusServer === "gangguan" ? "bg-red-600" : "bg-slate-300"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                statusServer === "ok" ? "text-green-700" : statusServer === "gangguan" ? "text-red-700" : "text-slate-500"
              }`}
            >
              {statusServer === "ok" ? "Server Operasional" : statusServer === "gangguan" ? "Server Gangguan" : "Memeriksa status…"}
            </span>
          </div>
        </div>
      </div>

      {/* PANEL KANAN */}
      <div className="grid place-items-center bg-[#F3F4F6] px-4 py-10">
        <div className="w-full" style={{ maxWidth: "min(400px, calc(100% - 0px))" }}>
          <main className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,.08)]">
            <span className="mb-4 inline-flex h-7 items-center gap-1.5 rounded-full bg-blue-100 px-3 text-xs font-semibold text-blue-700">
              <IconBuilding />
              {s.chip}
            </span>

            <h1 className="mb-2 text-[28px] font-bold leading-8.5 text-slate-900">Selamat Datang</h1>
            <p className="mb-6 max-w-84 text-sm leading-5.5 text-slate-500">{s.subteks}</p>

            <div role="tablist" className="mb-6 flex h-11 rounded-xl bg-[#EEF3FB] p-1">
              {(["dosen", "admin"] as Peran[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={peran === p}
                  onClick={() => gantiTab(p)}
                  className={`flex-1 rounded-lg text-sm transition-colors ${
                    peran === p
                      ? "bg-white font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,.10)]"
                      : "font-medium text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p === "dosen" ? "Dosen" : "Admin"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="identitas"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700"
                >
                  {s.labelField}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconUser />
                  </span>
                  <input
                    ref={identitasRef}
                    id="identitas"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={status !== "idle"}
                    aria-invalid={!!errorIdentitas}
                    aria-describedby="identitas-bantu"
                    placeholder={s.placeholder}
                    value={identitas}
                    onChange={(e) => {
                      setIdentitas(e.target.value);
                      if (errorIdentitas) setErrorIdentitas("");
                    }}
                    className={`h-12 w-full rounded-xl border bg-white pl-11 pr-3.5 text-base font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] ${
                      errorIdentitas
                        ? "border-red-600 ring-4 ring-red-600/15"
                        : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                    }`}
                  />
                </div>
                <p id="identitas-bantu" className="mt-1.5 text-xs text-[#64748B]">
                  {errorIdentitas ? <span className="font-medium text-red-600">{errorIdentitas}</span> : s.teksBantu}
                </p>
              </div>

              <div className="mb-2">
                <label
                  htmlFor="kataSandi"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[.04em] text-slate-700"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconLock />
                  </span>
                  <input
                    id="kataSandi"
                    type={tampilSandi ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={status !== "idle"}
                    aria-invalid={!!errorSandi}
                    aria-describedby="sandi-bantu"
                    value={kataSandi}
                    onChange={(e) => {
                      setKataSandi(e.target.value);
                      if (errorSandi) setErrorSandi("");
                    }}
                    onKeyUp={(e) => setCapsLockAktif(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLockAktif(false)}
                    className={`h-12 w-full rounded-xl border bg-white pl-11 pr-11 text-base font-medium text-slate-900 outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] ${
                      errorSandi
                        ? "border-red-600 ring-4 ring-red-600/15"
                        : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={tampilSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-pressed={tampilSandi}
                    onClick={() => setTampilSandi((v) => !v)}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-600"
                  >
                    <IconEye off={tampilSandi} />
                  </button>
                </div>
                <div id="sandi-bantu" className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs">
                    {errorSandi && <span className="font-medium text-red-600">{errorSandi}</span>}
                    {!errorSandi && capsLockAktif && (
                      <span className="inline-flex items-center gap-1 font-medium text-orange-600">
                        <IconWarning /> Caps Lock aktif
                      </span>
                    )}
                  </span>
                  <a href="/lupa-sandi" className="text-[13px] font-semibold text-blue-600 hover:underline">
                    Lupa kata sandi?
                  </a>
                </div>
              </div>

              {errorBanner && (
                <div role="alert" className="mb-4 rounded-xl border border-red-600/25 bg-red-100 px-3.5 py-2.5 text-sm font-medium text-red-700">
                  {errorBanner}
                </div>
              )}

              <button
                type="submit"
                aria-disabled={!siap}
                disabled={!siap}
                className={`group mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white transition-all ${
                  siap
                    ? "bg-blue-600 shadow-[0_8px_20px_rgba(47,107,234,.28)] hover:bg-blue-700 active:translate-y-px"
                    : "cursor-not-allowed bg-blue-100 text-blue-300 shadow-none"
                }`}
              >
                {status === "loading" && (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Memeriksa akun&hellip;
                  </>
                )}
                {status === "success" && "Berhasil, mengalihkan&hellip;"}
                {status === "idle" && (
                  <>
                    Masuk ke Sistem Evaluasi
                    <IconArrowRight />
                    <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:ml-1 [@media(hover:hover)_and_(pointer:fine)]:inline-flex h-4.5 items-center rounded-md bg-white/20 px-1.5 font-mono text-[11px] font-medium">
                      &crarr; Enter
                    </span>
                  </>
                )}
              </button>
            </form>
          </main>
          <p className="mt-6 text-center text-xs text-[#64748B]">
            &copy; 2024 Program Studi Teknik Elektro &bull; Universitas Trunojoyo Madura
          </p>
        </div>
      </div>
    </div>
  );
}