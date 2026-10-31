"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardDosenCourse, DashboardDosenData } from "@/lib/dashboard-dosen";

const WARNA_BOBOT = ["#1E3A8A", "#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#DBEAFE"];

function Ikon({ nama, ukuran = 20 }: { nama: "topi" | "buku" | "badge" | "chart" | "hierarki"; ukuran?: number }) {
  const base = {
    width: ukuran,
    height: ukuran,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (nama) {
    case "topi":
      return <svg {...base}><path d="m2 10 10-5 10 5-10 5-10-5Z" /><path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5M22 10v6" /></svg>;
    case "buku":
      return <svg {...base}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h8" /></svg>;
    case "badge":
      return <svg {...base}><path d="m12 3 2.7 1.4 3-.2.8 2.9 2.2 2.1-1.3 2.7.2 3-2.9.8-2.1 2.2-2.6-1.3-3 .2-.9-2.9-2.1-2.1 1.3-2.7-.2-3 2.9-.8L12 3Z" /><path d="m9 11.5 2 2 4-4" /></svg>;
    case "chart":
      return <svg {...base}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>;
    case "hierarki":
      return <svg {...base}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><path d="M9 6h6M18 9v6M6 9v9h9" /></svg>;
  }
}

function Kartu({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-[20px] border border-[#E8ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.04)] sm:p-5 ${className}`}>
      <div className="mb-3">
        <h2 className="text-[15px] font-bold text-[#111827]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-[#64748B]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: "topi" | "buku" | "badge" }) {
  return (
    <section className="flex min-h-24 items-start justify-between rounded-[20px] border border-[#E8ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.04)] sm:p-5">
      <h2 className="max-w-[72%] text-[11px] font-medium leading-4 text-[#334155] sm:text-xs">{label}</h2>
      <div className="flex h-full flex-col items-end justify-between">
        <span className="text-[#2563EB]"><Ikon nama={icon} ukuran={17} /></span>
        <strong className="text-[32px] font-bold leading-none tracking-tight text-[#2563EB] sm:text-[40px]">{value}</strong>
      </div>
    </section>
  );
}

function GrafikMahasiswa({
  courses,
  selectedId,
  onSelect,
}: {
  courses: DashboardDosenCourse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const max = Math.max(1, ...courses.map((item) => item.jumlahMahasiswa));
  return (
    <div
      className="relative flex h-[158px] items-end gap-3 overflow-x-auto px-1 pb-1 pt-5"
      role="group"
      aria-label="Jumlah mahasiswa terdaftar per mata kuliah"
    >
      {courses.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          title={`${item.nama} · ${item.jumlahMahasiswa} mahasiswa`}
          aria-pressed={selectedId === item.id}
          className="group flex h-full min-w-[42px] flex-1 flex-col items-center justify-end gap-1 rounded-md px-0.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="text-[10px] font-semibold">{item.jumlahMahasiswa}</span>
          <span
            className={`w-full max-w-10 rounded-t-md border border-white/80 bg-white transition-[height,opacity] group-hover:opacity-85 ${selectedId === item.id ? "shadow-[0_0_0_2px_rgba(255,255,255,.35)]" : ""}`}
            style={{ height: `${Math.max(item.jumlahMahasiswa > 0 ? 8 : 3, (item.jumlahMahasiswa / max) * 96)}px` }}
          />
          <span className="max-w-full truncate text-[9px] leading-3">{item.kode}</span>
        </button>
      ))}
      {courses.length === 0 && <p className="absolute inset-0 grid place-items-center text-xs text-white/90">Belum ada mata kuliah yang ditugaskan.</p>}
    </div>
  );
}

function DonutBobot({ course }: { course: DashboardDosenCourse | null }) {
  const tugas = course?.tugas ?? [];
  const { total, segments } = tugas.reduce<{ total: number; segments: string[] }>((hasil, item, index) => {
    const nextTotal = hasil.total + item.bobot;
    return {
      total: nextTotal,
      segments: [...hasil.segments, `${WARNA_BOBOT[index % WARNA_BOBOT.length]} ${hasil.total}% ${nextTotal}%`],
    };
  }, { total: 0, segments: [] });

  return (
    <>
      <div className="flex min-h-[138px] items-center justify-center gap-4">
        <div
          className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{ background: segments.length ? `conic-gradient(${segments.join(", ")})` : "#E5EAF3" }}
          role="img"
          aria-label={`Diagram bobot tugas mata kuliah ${course?.nama ?? ""}, total ${total}%`}
        >
          <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-center">
            <span><b className="block text-[14px] leading-4 text-[#111827]">{total}%</b><small className="text-[9px] text-[#64748B]">Total</small></span>
          </div>
        </div>
        <ul className="max-h-32 min-w-24 space-y-1 overflow-y-auto text-[9px]">
          {tugas.map((item, index) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: WARNA_BOBOT[index % WARNA_BOBOT.length] }} />
              <span className="max-w-20 truncate text-[#475569]" title={item.nama}>T{index + 1}</span>
              <b className="ml-auto text-[#111827]">{item.bobot}%</b>
            </li>
          ))}
          {tugas.length === 0 && <li className="py-4 text-center text-[#64748B]">Belum ada tugas.</li>}
        </ul>
      </div>
      <p className="truncate text-center text-[11px] font-semibold text-[#1F2937]" title={course?.nama}>{course?.nama ?? "Pilih mata kuliah"}</p>
      {tugas.length > 0 && Math.abs(total - 100) > 0.01 && (
        <p role="status" className="mt-1 text-center text-[10px] font-medium text-[#B45309]">Total bobot ≠ 100% ({total}%).</p>
      )}
    </>
  );
}

function PilDots({
  courses,
  activeId,
  onSelect,
  label,
}: {
  courses: DashboardDosenCourse[];
  activeId: string | null;
  onSelect: (id: string) => void;
  label: string;
}) {
  if (courses.length < 2) return null;
  return (
    <div className="mt-2 flex justify-center gap-1.5" role="group" aria-label={label}>
      {courses.map((course, index) => (
        <button
          key={course.id}
          type="button"
          onClick={() => onSelect(course.id)}
          aria-label={`Tampilkan MK ke-${index + 1}: ${course.nama}`}
          aria-pressed={activeId === course.id}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const arah = event.key === "ArrowRight" ? 1 : -1;
            onSelect(courses[(index + arah + courses.length) % courses.length].id);
          }}
          className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${activeId === course.id ? "w-5 bg-[#2563EB]" : "w-1.5 bg-[#D7DEE9] hover:bg-[#94A3B8]"}`}
        />
      ))}
    </div>
  );
}

function Sebaran({ courses }: { courses: DashboardDosenCourse[] }) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#E8ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.04)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="max-w-48 text-[15px] font-bold leading-5 text-[#111827]">Sebaran CPMK &amp; Sub-CPMK</h2>
        <span className="text-[#2563EB]"><Ikon nama="hierarki" /></span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-3 [scrollbar-width:thin]">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/dosen/komponen-penilaian/${course.id}`}
            className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-[#F3F7FF] p-2.5 transition-shadow hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            <span className="min-w-0 flex-1 text-[11px] font-medium leading-4 text-[#172033]" title={course.nama}>{course.nama}</span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="max-w-32 truncate rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[9px] font-medium text-[#1D4ED8]" title={`CPMK: ${course.cpmk.map((item) => item.kode).join(", ")}`}>
                CPMK [{course.cpmk.map((item) => item.kode.replace(/^CPMK[- ]*/i, "")).join(", ") || "–"}]
              </span>
              <span className="max-w-32 truncate rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[9px] font-medium text-[#334155]" title={`Sub-CPMK: ${course.subCpmk.map((item) => item.kode).join(", ")}`}>
                Sub [{course.subCpmk.map((item) => item.kode.replace(/^SUB[- ]?CPMK[- ]*/i, "")).join(", ") || "–"}]
              </span>
            </span>
          </Link>
        ))}
        {courses.length === 0 && <p className="py-8 text-center text-xs text-[#64748B]">Belum ada sebaran CPMK.</p>}
      </div>
      {courses.length > 4 && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />}
    </section>
  );
}

export function DashboardDosen({ data }: { data: DashboardDosenData | null }) {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(data?.mataKuliah[0]?.id ?? null);
  const courses = data?.mataKuliah ?? [];
  const activeCourse = courses.find((item) => item.id === activeCourseId) ?? courses[0] ?? null;
  function pilihMK(id: string) {
    setActiveCourseId(id);
  }

  if (!data) {
    return (
      <section className="grid min-h-72 place-items-center rounded-[20px] border border-[#E8ECF3] bg-white p-8 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FC] text-[#1D4ED8]"><Ikon nama="buku" /></span>
          <h1 className="mt-3 text-lg font-bold text-[#111827]">Belum ada Tahun Ajaran aktif</h1>
          <p className="mt-1 text-sm text-[#64748B]">Dashboard akan menampilkan ringkasan mata kuliah dan progres setelah Tahun Ajaran diaktifkan.</p>
        </div>
      </section>
    );
  }

  return (
  <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-xs text-[#64748B]">Ringkasan beban ajar dan progres penilaian · T.A. {data.tahunAjaran}</p>
        </div>
        <span className="rounded-full bg-[#2563EB] px-3 py-1.5 text-[11px] font-semibold text-white">T.A. {data.tahunAjaran}</span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid min-w-0 content-start gap-4 xl:h-full">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Mata kuliah yang diampu" value={courses.length} icon="topi" />
            <StatCard label="Total SKS" value={data.totalSks} icon="buku" />
            <StatCard label="Total Sub-CPMK" value={data.totalSubCpmk} icon="badge" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,.75fr)]">
            <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#2F6FEB] to-[#4F8BF5] p-4 text-white shadow-[0_5px_14px_rgba(37,99,235,.18)] sm:p-5">
              <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-bold">Data Setiap MK</h2>
                  <p className="text-[10px] text-white/85">Jumlah mahasiswa terdaftar</p>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20"><Ikon nama="chart" ukuran={15} /></span>
              </div>
              <GrafikMahasiswa courses={courses} selectedId={activeCourse?.id ?? null} onSelect={pilihMK} />
            </section>

            <Kartu title="Bobot Tugas">
              <DonutBobot course={activeCourse} />
              <PilDots courses={courses} activeId={activeCourse?.id ?? null} onSelect={pilihMK} label="Pilih mata kuliah untuk bobot tugas" />
            </Kartu>
          </div>

          <Kartu title="Data tiap Tugas" subtitle="Progres pengumpulan & penilaian mahasiswa" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-[#64748B]">Nilai yang sudah masuk dibanding peserta tugas</span>
              {courses.length > 1 ? (
                <label className="rounded-full bg-[#EEF3FC] px-3 text-[10px] font-semibold text-[#1D4ED8]">
                  <span className="sr-only">Mata kuliah aktif</span>
                  <select value={activeCourse?.id ?? ""} onChange={(event) => pilihMK(event.target.value)} className="h-7 max-w-52 bg-transparent outline-none">
                    {courses.map((item) => <option key={item.id} value={item.id}>{item.kode} · {item.nama}</option>)}
                  </select>
                </label>
              ) : activeCourse ? <span className="rounded-full bg-[#EEF3FC] px-3 py-1.5 text-[10px] font-semibold text-[#1D4ED8]">{activeCourse.nama}</span> : null}
            </div>
            {activeCourse?.tugas.length ? (
              <div className="xl:min-h-0 xl:flex-1 xl:space-y-2.5 xl:overflow-y-auto xl:pr-1">
                {activeCourse.tugas.map((task, index) => {
                  const persen = task.total ? Math.round((task.dinilai / task.total) * 100) : 0;
                  const kelasId = task.kelasId ?? (!activeCourse.koordinator ? activeCourse.kelas[0]?.id : undefined);
                  const params = new URLSearchParams({ tugas: task.id });
                  if (kelasId) params.set("kelas", kelasId);
                  return (
                    <Link
                      key={task.id}
                      href={`/dosen/input-nilai/${activeCourse.id}?${params.toString()}`}
                      className="grid grid-cols-[52px_minmax(0,1fr)_100px] items-center gap-2 rounded-lg text-[10px] transition-colors hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] sm:grid-cols-[58px_minmax(0,1fr)_130px]"
                    >
                      <span className="truncate font-medium text-[#172033]" title={task.nama}>Tugas {index + 1}</span>
                      <span
                        role="progressbar"
                        aria-label={`${task.nama}: ${task.dinilai} dari ${task.total} mahasiswa`}
                        aria-valuenow={task.dinilai}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(1, task.total)}
                        className="h-2 overflow-hidden rounded-full bg-[#E5EAF3]"
                      >
                        <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${persen}%` }} />
                      </span>
                      <span className="truncate text-right text-[9px] text-[#475569] sm:text-[10px]">{task.dinilai} / {task.total} Mhs</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="grid min-h-28 place-items-center text-center text-xs text-[#64748B]">Belum ada tugas untuk mata kuliah ini.</p>
            )}
            <PilDots courses={courses} activeId={activeCourse?.id ?? null} onSelect={pilihMK} label="Pilih mata kuliah untuk progres tugas" />
          </Kartu>

        </div>

<aside className="flex min-h-0 flex-col">
  <Sebaran courses={courses} />
</aside>
      </div>
    </div>
  );
}
