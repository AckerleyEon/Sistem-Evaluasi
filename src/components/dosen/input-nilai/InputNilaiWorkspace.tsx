"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { analisisImporNilai, simpanNilaiMassal, type BarisImporNilai } from "@/lib/actions/nilai";

type MataKuliahItem = {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  jumlahMahasiswa: number;
};

type TugasItem = {
  id: string;
  nama: string;
  pertemuanKe: number;
  bobot: number;
  kelasId: string | null;
  indikator: {
    id: string;
    kode: string;
    deskripsi: string;
    cpmk: { kode: string; bobot: number; cpl: string[] }[];
    tugas: { id: string; nama: string; bobot: number; kelasId: string | null }[];
  }[];
};

type MahasiswaItem = {
  id: string;
  nim: string;
  nama: string;
  angkatan: number;
  kelasId: string | null;
};

type Props = {
  mataKuliah: { id: string; kode: string; nama: string };
  daftarMK: MataKuliahItem[];
  tahunAjaran: string;
  kelasId: string | null;
  kelasNama: string | null;
  semuaKelasAllowed: boolean;
  daftarKelas: { id: string; nama: string }[];
  tugas: TugasItem[];
  tugasDipilihId: string | null;
  mahasiswa: MahasiswaItem[];
  nilaiPerMahasiswa: Record<string, Record<string, number>>;
  passingGrade: number;
  readOnly?: boolean;
};

type FilterStatus = "semua" | "remedial" | "belum" | "tuntas";

const PAGE_SIZE = 8;

function formatNilai(nilai: number, digit = 1) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digit,
  }).format(nilai);
}

function predikat(nilai: number | null) {
  if (nilai === null) return "–";
  if (nilai >= 90) return "A";
  if (nilai >= 75) return "B";
  if (nilai >= 50) return "C";
  if (nilai >= 30) return "D";
  if (nilai >= 15) return "E";
  return "F";
}

function hitungIndikator(
  indikator: TugasItem["indikator"][number],
  mahasiswa: MahasiswaItem,
  nilai: Record<string, number>,
) {
  const tugasRelevan = indikator.tugas.filter(
    (tugas) => tugas.kelasId === null || tugas.kelasId === mahasiswa.kelasId,
  );
  const terisi = tugasRelevan.flatMap((tugas) =>
    nilai[tugas.id] === undefined ? [] : [{ nilai: nilai[tugas.id], bobot: tugas.bobot }],
  );
  if (terisi.length === 0) return null;
  const totalBobot = terisi.reduce((jumlah, item) => jumlah + item.bobot, 0);
  const rata = totalBobot > 0
    ? terisi.reduce((jumlah, item) => jumlah + item.nilai * item.bobot, 0) / totalBobot
    : terisi.reduce((jumlah, item) => jumlah + item.nilai, 0) / terisi.length;
  return { nilai: rata, lengkap: terisi.length === tugasRelevan.length };
}

function Ikon({
  nama,
  ukuran = 18,
}: {
  nama: "file" | "save" | "task" | "rubric" | "search" | "shield" | "filter" | "close";
  ukuran?: number;
}) {
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
    case "file":
      return <svg {...base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>;
    case "save":
      return <svg {...base}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "task":
      return <svg {...base}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 2.5 2.5L16 9M8 6h8" /></svg>;
    case "rubric":
      return <svg {...base}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case "search":
      return <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "shield":
      return <svg {...base}><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>;
    case "filter":
      return <svg {...base}><path d="M4 4h16l-6 7v6l-4 3v-9L4 4Z" /></svg>;
    case "close":
      return <svg {...base}><path d="m18 6-12 12M6 6l12 12" /></svg>;
  }
}

function BadgeStatus({ nilai, ambang }: { nilai: number | null; ambang: number }) {
  if (nilai === null) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#E8ECF3] px-2.5 py-1 text-[10px] font-semibold text-[#475569]">● Belum Dinilai</span>;
  }
  if (nilai < ambang) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE8E8] px-2.5 py-1 text-[10px] font-semibold text-[#B91C1C]">● Remidi</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F7EC] px-2.5 py-1 text-[10px] font-semibold text-[#15803D]">● Tercapai</span>;
}

export function InputNilaiWorkspace({
  mataKuliah,
  daftarMK,
  tahunAjaran,
  kelasId,
  kelasNama,
  semuaKelasAllowed,
  daftarKelas,
  tugas,
  tugasDipilihId,
  mahasiswa,
  nilaiPerMahasiswa,
  passingGrade,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const tugasDipilih = tugas.find((item) => item.id === tugasDipilihId) ?? null;
  const [nilaiDraft, setNilaiDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(mahasiswa.map((item) => {
      const nilai = tugasDipilih ? nilaiPerMahasiswa[item.id]?.[tugasDipilih.id] : undefined;
      return [item.id, nilai === undefined ? "" : String(nilai)];
    })),
  );
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [pencarian, setPencarian] = useState("");
  const [pencarianTertunda, setPencarianTertunda] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [dialogImpor, setDialogImpor] = useState(false);
  const [fileImpor, setFileImpor] = useState<File | null>(null);
  const [pratinjauImpor, setPratinjauImpor] = useState<BarisImporNilai[] | null>(null);
  const [galatImpor, setGalatImpor] = useState("");
  const [toast, setToast] = useState("");
  const [galatSimpan, setGalatSimpan] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isImporPending, startImporTransition] = useTransition();

  const nilaiAwal = useMemo(
    () => Object.fromEntries(mahasiswa.map((item) => {
      const nilai = tugasDipilih ? nilaiPerMahasiswa[item.id]?.[tugasDipilih.id] : undefined;
      return [item.id, nilai === undefined ? "" : String(nilai)];
    })),
    [mahasiswa, nilaiPerMahasiswa, tugasDipilih],
  );

  const berubah = mahasiswa.some((item) => (nilaiDraft[item.id] ?? "") !== (nilaiAwal[item.id] ?? ""));
  const skorDraft = (id: string) => {
    const teks = (nilaiDraft[id] ?? "").trim();
    if (!teks) return null;
    const angka = Number(teks);
    return Number.isFinite(angka) && angka >= 0 && angka <= 100 ? angka : null;
  };
  const tidakValid = (id: string) => {
    const teks = (nilaiDraft[id] ?? "").trim();
    if (!teks) return false;
    if ((nilaiDraft[id] ?? "") === (nilaiAwal[id] ?? "")) return false;
    const angka = Number(teks);
    return !Number.isFinite(angka) || angka < 0 || angka > 100 || !/^\d{1,3}([.,]\d)?$/.test(teks);
  };

  const statistik = useMemo(() => {
    const terisi = mahasiswa.flatMap((item) => {
      const skor = skorDraft(item.id);
      return skor === null ? [] : [skor];
    });
    const hasilIndikator = mahasiswa.flatMap((item) =>
      (tugasDipilih?.indikator ?? []).flatMap((indikator) => {
        const nilai = { ...(nilaiPerMahasiswa[item.id] ?? {}) };
        if (tugasDipilih) {
          const skor = skorDraft(item.id);
          if (skor === null) delete nilai[tugasDipilih.id];
          else nilai[tugasDipilih.id] = skor;
        }
        const hasil = hitungIndikator(indikator, item, nilai);
        return hasil ? [{ mahasiswaId: item.id, ...hasil }] : [];
      }),
    );
    const sukses = hasilIndikator.filter((hasil) => hasil.nilai >= passingGrade).length;
    const remedial = hasilIndikator.filter((hasil) => hasil.nilai < passingGrade).length;
    return {
      dinilai: terisi.length,
      belum: mahasiswa.length - terisi.length,
      rata: terisi.length ? terisi.reduce((jumlah, skor) => jumlah + skor, 0) / terisi.length : null,
      persenDinilai: mahasiswa.length ? (terisi.length / mahasiswa.length) * 100 : 0,
      persenTercapai: hasilIndikator.length ? (sukses / hasilIndikator.length) * 100 : null,
      mahasiswaTercapai: new Set(hasilIndikator.filter((hasil) => hasil.nilai >= passingGrade).map((hasil) => hasil.mahasiswaId)).size,
      remedial,
    };
  // Draft values are read through the component state so every edit updates these summaries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mahasiswa, nilaiDraft, nilaiPerMahasiswa, passingGrade, tugasDipilih]);

  useEffect(() => {
    const timer = setTimeout(() => setPencarianTertunda(pencarian.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [pencarian]);

  useEffect(() => {
    if (!berubah) return;
    const peringatan = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", peringatan);
    return () => window.removeEventListener("beforeunload", peringatan);
  }, [berubah]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const daftarFilter = useMemo(
    () =>
      mahasiswa.filter((item) => {
        const nilai = skorDraft(item.id);
        const cocokCari =
          !pencarianTertunda ||
          item.nama.toLowerCase().includes(pencarianTertunda) ||
          item.nim.toLowerCase().includes(pencarianTertunda);
        const cocokFilter =
          filter === "semua" ||
          (filter === "belum" && nilai === null) ||
          (filter === "remedial" && nilai !== null && nilai < passingGrade) ||
          (filter === "tuntas" && nilai !== null && nilai >= passingGrade);
        return cocokCari && cocokFilter;
      }),
    // scoreDraft is a state-derived helper; nilaiDraft is included to refresh filter counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mahasiswa, nilaiDraft, pencarianTertunda, filter, passingGrade],
  );
  const totalHalaman = Math.max(1, Math.ceil(daftarFilter.length / PAGE_SIZE));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mulai = (halamanAktif - 1) * PAGE_SIZE;
  const mahasiswaTampil = daftarFilter.slice(mulai, mulai + PAGE_SIZE);
  const jumlahFilter = {
    semua: mahasiswa.length,
    remedial: mahasiswa.filter((item) => skorDraft(item.id) !== null && skorDraft(item.id)! < passingGrade).length,
    belum: mahasiswa.filter((item) => skorDraft(item.id) === null).length,
    tuntas: mahasiswa.filter((item) => skorDraft(item.id) !== null && skorDraft(item.id)! >= passingGrade).length,
  };
  const jumlahIndikator = tugasDipilih?.indikator.length ?? 0;
  const kodeCpmkTerpetakan = [...new Set(tugasDipilih?.indikator.flatMap((indikator) => indikator.cpmk.map((item) => item.kode)) ?? [])];
  const kodeSubCpmkTerpetakan = tugasDipilih?.indikator.map((indikator) => indikator.kode) ?? [];
  const semuaTerpilih = mahasiswaTampil.length > 0 && mahasiswaTampil.every((item) => terpilih.has(item.id));
  function gantiSkor(mahasiswaId: string, nilai: string) {
    setNilaiDraft((sebelumnya) => ({ ...sebelumnya, [mahasiswaId]: nilai }));
    setGalatSimpan("");
  }

  function simpan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = mahasiswa.find(
      (item) =>
        tidakValid(item.id) &&
        (nilaiDraft[item.id] ?? "") !== (nilaiAwal[item.id] ?? ""),
    );
    if (invalid) {
      setGalatSimpan(`Nilai ${invalid.nama} harus berupa angka 0–100 dengan maksimal satu angka desimal.`);
      return;
    }
    if (!tugasDipilih) return;
    setGalatSimpan("");
    const formData = new FormData();
    for (const item of mahasiswa) {
      if ((nilaiDraft[item.id] ?? "") === (nilaiAwal[item.id] ?? "")) continue;
      if ((nilaiDraft[item.id] ?? "").trim() === "") {
        if ((nilaiAwal[item.id] ?? "") !== "") formData.set(`hapus-${item.id}`, "on");
      } else {
        formData.set(`skor-${item.id}`, nilaiDraft[item.id]);
      }
    }
    startTransition(async () => {
      try {
        const hasil = await simpanNilaiMassal(mataKuliah.id, kelasId, tugasDipilih.id, formData);
        const pesan = [
          hasil.tersimpan > 0 ? `${hasil.tersimpan} nilai tersimpan` : "",
          hasil.dihapus > 0 ? `${hasil.dihapus} nilai dihapus` : "",
        ].filter(Boolean).join(", ");
        setToast(pesan ? `Berhasil: ${pesan}.` : "Tidak ada perubahan nilai untuk disimpan.");
        router.refresh();
      } catch (error) {
        setGalatSimpan(error instanceof Error ? error.message : "Perubahan gagal disimpan.");
      }
    });
  }

  function ubahHalaman(nomor: number) {
    setHalaman(Math.max(1, Math.min(totalHalaman, nomor)));
    setTerpilih(new Set());
  }

  function ubahPilihanSemua(checked: boolean) {
    setTerpilih((sebelumnya) => {
      const berikutnya = new Set(sebelumnya);
      for (const item of mahasiswaTampil) {
        if (checked) berikutnya.add(item.id);
        else berikutnya.delete(item.id);
      }
      return berikutnya;
    });
  }

  function kosongkanNilaiTerpilih() {
    setNilaiDraft((sebelumnya) => {
      const berikutnya = { ...sebelumnya };
      for (const id of terpilih) berikutnya[id] = "";
      return berikutnya;
    });
    setTerpilih(new Set());
  }

  function analisisExcel() {
    if (!fileImpor || !tugasDipilih) return;
    const formData = new FormData();
    formData.set("file", fileImpor);
    setGalatImpor("");
    startImporTransition(async () => {
      try {
        const hasil = await analisisImporNilai(mataKuliah.id, kelasId, tugasDipilih.id, formData);
        if (!hasil.ok) {
          setGalatImpor(hasil.error);
          setPratinjauImpor(null);
        } else {
          setPratinjauImpor(hasil.baris);
        }
      } catch (error) {
        setGalatImpor(error instanceof Error ? error.message : "File Excel gagal diproses.");
        setPratinjauImpor(null);
      }
    });
  }

  function terapkanImpor() {
    const barisValid = (pratinjauImpor ?? []).filter(
      (baris): baris is BarisImporNilai & { mahasiswaId: string; nilai: number } =>
        baris.mahasiswaId !== null && baris.nilai !== null && baris.pesan === null,
    );
    setNilaiDraft((sebelumnya) => {
      const berikutnya = { ...sebelumnya };
      for (const baris of barisValid) {
        if (mahasiswa.some((item) => item.id === baris.mahasiswaId)) {
          berikutnya[baris.mahasiswaId] = String(baris.nilai);
        }
      }
      return berikutnya;
    });
    setDialogImpor(false);
    setToast(`${barisValid.length} nilai valid dimasukkan. Simpan perubahan untuk menerapkannya.`);
  }

  const totalImportValid = (pratinjauImpor ?? []).filter((baris) => baris.pesan === null).length;
  const jumlahKelas = daftarKelas.length;

  return (
    <div className="space-y-4 pb-2">
      {toast && (
        <div role="status" className="fixed right-5 top-20 z-50 rounded-xl bg-[#166534] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">Penilaian Capaian Mahasiswa</h1>
          <span className="shrink-0 rounded-full bg-[#DBE7FB] px-2.5 py-1 text-[10px] font-semibold text-[#1D4ED8] sm:text-xs">
            Tahun Ajar {tahunAjaran}
          </span>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setDialogImpor(true);
              setFileImpor(null);
              setPratinjauImpor(null);
              setGalatImpor("");
            }}
            disabled={readOnly || !tugasDipilih}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#C9D8F7] bg-white px-3 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#EEF3FC] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Ikon nama="file" ukuran={16} /> Import Excel (.xlsx)
          </button>
          <button
            type="submit"
            form="form-input-nilai"
            disabled={readOnly || !berubah || isPending || !tugasDipilih}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 text-xs font-semibold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Ikon nama="save" ukuran={16} /> {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
      {berubah && (
        <p role="status" className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] font-medium text-[#92400E]">
          Ada perubahan nilai yang belum disimpan. Tekan “Simpan Perubahan” sebelum meninggalkan atau memuat ulang halaman.
        </p>
      )}

      <nav aria-label="Mata kuliah" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {daftarMK.map((mk) => {
          const aktif = mk.id === mataKuliah.id;
          return (
            <Link
              key={mk.id}
              href={`/dosen/input-nilai/${mk.id}`}
              aria-current={aktif ? "page" : undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                aktif
                  ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                  : "border-[#E5E9F0] bg-white text-[#475569] hover:border-[#C9D8F7] hover:bg-[#EEF3FC]"
              }`}
            >
              {aktif && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />}
              {mk.nama.replace(/\s*\([^)]*\)\s*$/, "")}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${aktif ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {mk.jumlahMahasiswa} Mhs
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF3FC] text-[#1D4ED8]">
            <Ikon nama="task" ukuran={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                {tugasDipilih ? `${tugasDipilih.nama} — Pertemuan ${tugasDipilih.pertemuanKe}` : "Belum ada tugas penilaian"}
              </h2>
              {tugasDipilih && (
                <span className="rounded-full bg-[#DBE7FB] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                  Bobot: {formatNilai(tugasDipilih.bobot * 100, 1)}%
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {tugasDipilih && jumlahIndikator ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span>Pemetaan:</span>
                  {kodeCpmkTerpetakan.length > 0 ? (
                    <span
                      className="rounded-full bg-[#EEF3FC] px-2 py-0.5 font-semibold text-[#1D4ED8]"
                      title={`CPMK: ${kodeCpmkTerpetakan.join(", ")}`}
                    >
                      {kodeCpmkTerpetakan.length} CPMK
                    </span>
                  ) : (
                    <span className="font-semibold text-[#64748B]">CPMK belum ditautkan</span>
                  )}
                  <span
                    className="rounded-full bg-[#EEF3FC] px-2 py-0.5 font-semibold text-[#1D4ED8]"
                    title={`Sub-CPMK: ${kodeSubCpmkTerpetakan.join(", ")}`}
                  >
                    {kodeSubCpmkTerpetakan.length} Sub-CPMK
                  </span>
                  {kelasNama && <span>· Kelas <b className="text-[#1D4ED8]">{kelasNama}</b></span>}
                </span>
              ) : "Hubungkan tugas dengan Sub-CPMK melalui menu Kelola Asesmen."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {jumlahKelas > 0 && (
            <form action={`/dosen/input-nilai/${mataKuliah.id}`} method="get">
              {tugasDipilih && <input type="hidden" name="tugas" value={tugasDipilih.id} />}
              <label className="sr-only" htmlFor="pilih-kelas-nilai">Pilih kelas</label>
              <select
                id="pilih-kelas-nilai"
                name="kelas"
                defaultValue={kelasId ?? ""}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="h-9 max-w-56 rounded-xl border border-[#E5E9F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#1D4ED8] outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              >
                {semuaKelasAllowed && <option value="">Semua kelas</option>}
                {daftarKelas.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}
              </select>
            </form>
          )}
          <form action={`/dosen/input-nilai/${mataKuliah.id}`} method="get">
            {kelasId && <input type="hidden" name="kelas" value={kelasId} />}
            <label className="sr-only" htmlFor="pilih-tugas-nilai">Pilih tugas</label>
            <select
              id="pilih-tugas-nilai"
              name="tugas"
              value={tugasDipilih?.id ?? ""}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              disabled={tugas.length === 0}
              className="h-9 max-w-56 rounded-xl border border-[#C9D8F7] bg-[#EEF3FC] px-3 text-xs font-semibold text-[#1D4ED8] outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              {tugas.length === 0 && <option value="">Belum ada tugas</option>}
              {tugas.map((item) => <option key={item.id} value={item.id}>Pilih Tugas: {item.nama}</option>)}
            </select>
          </form>
          <Link
            href={`/dosen/hasil/${mataKuliah.id}${kelasId ? `?kelas=${encodeURIComponent(kelasId)}` : ""}`}
            className="text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            Lihat Hasil →
          </Link>
        </div>
      </div>

      <section aria-label="Ringkasan penilaian" aria-live="polite" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Sudah Dinilai</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statistik.belum ? "bg-[#FDE8E8] text-[#B91C1C]" : "bg-[#E6F7EC] text-[#15803D]"}`}>
              {statistik.belum} Belum
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <strong className="text-3xl font-bold tracking-tight text-[#1D4ED8]">{statistik.dinilai}</strong>
            <span className="text-sm text-[#64748B]">/{mahasiswa.length}</span>
            <span className="ml-auto text-xs font-semibold text-[#1D4ED8]">{formatNilai(statistik.persenDinilai)}%</span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E8ECF3]"
            role="progressbar"
            aria-label="Persentase mahasiswa yang sudah dinilai"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(statistik.persenDinilai)}
          >
            <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${statistik.persenDinilai}%` }} />
          </div>
        </article>

        <article className="rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Rata-rata Skor Tugas</p>
            <span className="rounded-full bg-[#E6F7EC] px-2 py-1 text-[10px] font-semibold text-[#15803D]">Ambang {passingGrade}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <strong className="text-3xl font-bold tracking-tight text-[#1D4ED8]">
              {statistik.rata === null ? "–" : formatNilai(statistik.rata)}
            </strong>
            <span className="text-sm text-[#64748B]">/100</span>
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            {statistik.rata === null
              ? "Belum ada nilai pada tugas ini."
              : statistik.rata >= passingGrade ? "Rata-rata memenuhi nilai ambang." : "Rata-rata masih di bawah nilai ambang."}
          </p>
        </article>

        <article className="rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Ketercapaian Sub-CPMK</p>
            <span className="rounded-full bg-[#DBE7FB] px-2 py-1 text-[10px] font-semibold text-[#1D4ED8]">Skor ≥ {passingGrade}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <strong className="text-3xl font-bold tracking-tight text-[#1D4ED8]">
              {statistik.persenTercapai === null ? "–" : formatNilai(statistik.persenTercapai, 0)}
            </strong>
            <span className="text-sm text-[#64748B]">%</span>
            <span className="ml-auto text-[10px] font-semibold text-[#15803D]">{statistik.mahasiswaTercapai} mahasiswa tercapai</span>
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            {statistik.persenTercapai === null
              ? "Belum ada nilai pada indikator yang dipetakan."
              : `${statistik.remedial} hasil indikator masih membutuhkan remedial.`}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[#1D4ED8]"><Ikon nama="rubric" ukuran={17} /></span>
          <h2 className="text-sm font-bold text-[#0F172A]">Rubrik Penilaian Multi-Indikator Sub-CPMK</h2>
          {tugasDipilih && <span className="rounded-full bg-[#DBE7FB] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">{tugasDipilih.nama}</span>}
        </div>
        {tugasDipilih && tugasDipilih.indikator.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {tugasDipilih.indikator.map((indikator) => (
              <article key={indikator.id} className="rounded-xl border border-[#DCE7FB] bg-[#EEF3FC] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#1D4ED8] px-2.5 py-1 text-[10px] font-semibold text-white">{indikator.kode}</span>
                  <span className="rounded-full border border-[#C9D8F7] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#1D4ED8]">
                    {indikator.cpmk.length ? indikator.cpmk.map((item) => `${item.kode} · ${item.bobot}%`).join(" / ") : "Belum dipetakan"}
                  </span>
                </div>
                <h3 className="mt-2 text-[13px] font-bold text-[#0F172A]">{indikator.deskripsi}</h3>
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[#475569]">
                  CPL target: {indikator.cpmk.flatMap((item) => item.cpl).filter((kode, i, daftar) => daftar.indexOf(kode) === i).join(", ") || "Belum ditentukan"}
                </p>
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#D6E1F4] pt-2 text-[10px] text-[#64748B]">
                  <span>Skala input: 0–100</span>
                  <span>Nilai ambang: <b className="text-[#1D4ED8]">{passingGrade}</b></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[#F8FAFC] px-4 py-8 text-center text-xs text-[#64748B]">
            {tugasDipilih ? "Belum ada Sub-CPMK yang didistribusikan ke tugas ini." : "Pilih atau buat tugas penilaian untuk melihat rubrik."}
          </p>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#E5E9F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="flex flex-col gap-3 border-b border-[#E5E9F0] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold text-[#64748B]">Filter:</span>
            {([
              ["semua", `Semua (${jumlahFilter.semua})`],
              ["remedial", `Di Bawah Ambang <${passingGrade} (${jumlahFilter.remedial})`],
              ["belum", `Belum Lengkap (${jumlahFilter.belum})`],
              ["tuntas", `Tuntas ≥${passingGrade} (${jumlahFilter.tuntas})`],
            ] as [FilterStatus, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value);
                  setHalaman(1);
                  setTerpilih(new Set());
                }}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                  filter === value ? "bg-[#1D4ED8] text-white" : "bg-[#EEF3FC] text-[#475569] hover:bg-[#DBE7FB]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-60">
            <span className="sr-only">Cari NIM atau nama mahasiswa</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"><Ikon nama="search" ukuran={15} /></span>
            <input
              type="search"
              value={pencarian}
              onChange={(event) => {
                setPencarian(event.target.value);
                setHalaman(1);
              }}
              placeholder="Cari NIM atau Nama Mahasiswa..."
              className="h-9 w-full rounded-xl bg-[#EEF3FC] pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </label>
        </div>

        {!readOnly && terpilih.size > 0 && (
          <div className="flex items-center justify-between gap-3 border-b border-[#DCE7FB] bg-[#F4F7FE] px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#1D4ED8]">{terpilih.size} mahasiswa dipilih</span>
            <button type="button" onClick={kosongkanNilaiTerpilih} className="rounded-lg border border-[#F2B8B8] bg-white px-3 py-1.5 font-semibold text-[#B91C1C] hover:bg-[#FDE8E8]">
              Kosongkan nilai
            </button>
          </div>
        )}

        <form id="form-input-nilai" onSubmit={simpan}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="h-11 bg-[#EEF3FC] text-[9px] font-bold uppercase tracking-wide text-[#475569]">
                  <th scope="col" className="w-10 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua mahasiswa di halaman"
                      checked={semuaTerpilih}
                      onChange={(event) => ubahPilihanSemua(event.target.checked)}
                      disabled={readOnly}
                      className="accent-[#1D4ED8]"
                    />
                  </th>
                  <th scope="col" className="w-12 px-2 text-center">No</th>
                  <th scope="col" className="sticky left-[88px] z-20 min-w-60 bg-[#EEF3FC] px-3">Mahasiswa</th>
                  <th scope="col" className="w-32 px-3 text-center">Input Nilai</th>
                  <th scope="col" className="w-32 px-3 text-center">
                    Nilai Akhir <span className="block text-[8px] font-medium">Bobot {tugasDipilih ? formatNilai(tugasDipilih.bobot * 100, 1) : 0}%</span>
                  </th>
                  <th scope="col" className="w-24 px-3 text-center">Predikat</th>
                  <th scope="col" className="w-36 px-3 text-center">Ketercapaian CPL</th>
                </tr>
              </thead>
              <tbody>
                {mahasiswaTampil.map((item, index) => {
                  const score = skorDraft(item.id);
                  const valid = !tidakValid(item.id);
                  const terjangkau = Boolean(tugasDipilih && (!tugasDipilih.kelasId || tugasDipilih.kelasId === item.kelasId));
                  const nilaiAkhir = score === null || !tugasDipilih ? null : score * tugasDipilih.bobot;
                  return (
                    <tr key={item.id} className="group h-[54px] border-b border-[#EDF0F4] text-xs transition-colors hover:bg-[#F8FAFD]">
                      <td className="px-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${item.nama}`}
                          checked={terpilih.has(item.id)}
                          disabled={readOnly}
                          onChange={(event) => setTerpilih((sebelumnya) => {
                            const berikutnya = new Set(sebelumnya);
                            if (event.target.checked) berikutnya.add(item.id);
                            else berikutnya.delete(item.id);
                            return berikutnya;
                          })}
                          className="accent-[#1D4ED8]"
                        />
                      </td>
                      <td className="px-2 text-center text-[10px] text-[#64748B]">{mulai + index + 1}</td>
                      <td className="sticky left-[88px] z-10 bg-white px-3 group-hover:bg-[#F8FAFD]">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                            score === null ? "bg-[#E8ECF3] text-[#64748B]" : score < passingGrade ? "bg-[#FDE8E8] text-[#B91C1C]" : "bg-[#DBE7FB] text-[#1D4ED8]"
                          }`}>
                            {item.nama.split(/\s+/).slice(0, 2).map((bagian) => bagian[0]).join("").toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[#0F172A]">{item.nama}</span>
                            <span className="block font-mono text-[9px] text-[#94A3B8]">{item.nim}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={nilaiDraft[item.id] ?? ""}
                          onChange={(event) => gantiSkor(item.id, event.target.value)}
                          disabled={readOnly || !terjangkau || !tugasDipilih}
                          aria-label={`Nilai ${item.nama}`}
                          aria-invalid={!valid}
                          title={!valid ? "Nilai harus 0–100 dengan maksimal satu angka desimal" : undefined}
                          placeholder="–"
                          className={`h-8 w-16 rounded-lg bg-[#EEF3FC] px-2 text-center text-xs font-semibold text-[#0F172A] outline-none transition focus:ring-2 focus:ring-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                            !valid ? "border border-[#DC2626] bg-[#FDE8E8] text-[#B91C1C]" : score !== null && score < passingGrade ? "text-[#B91C1C]" : ""
                          }`}
                        />
                      </td>
                      <td className={`px-3 text-center font-semibold ${nilaiAkhir !== null && score !== null && score < passingGrade ? "text-[#B91C1C]" : "text-[#0F172A]"}`}>
                        {nilaiAkhir === null ? "–" : formatNilai(nilaiAkhir)}
                      </td>
                      <td className={`px-3 text-center text-sm font-bold ${score !== null && score < passingGrade ? "text-[#B91C1C]" : "text-[#1D4ED8]"}`}>
                        {predikat(score)}
                      </td>
                      <td className="px-3 text-center"><BadgeStatus nilai={score} ambang={passingGrade} /></td>
                    </tr>
                  );
                })}
                {mahasiswaTampil.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#64748B]">
                      {mahasiswa.length === 0
                        ? "Belum ada mahasiswa terdaftar pada mata kuliah dan kelas ini."
                        : "Tidak ada mahasiswa yang sesuai dengan filter atau pencarian."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </form>

        {galatSimpan && <p role="alert" className="border-t border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs font-medium text-[#B91C1C]">{galatSimpan}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-[10px] text-[#64748B]">
            Menampilkan {daftarFilter.length === 0 ? 0 : mulai + 1}–{Math.min(mulai + PAGE_SIZE, daftarFilter.length)} dari {daftarFilter.length} mahasiswa
          </p>
          <nav aria-label="Halaman mahasiswa" className="flex items-center gap-1">
            <button type="button" onClick={() => ubahHalaman(halamanAktif - 1)} disabled={halamanAktif <= 1} aria-label="Halaman sebelumnya" className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E9F0] text-[#475569] disabled:opacity-40">‹</button>
            {Array.from({ length: totalHalaman }, (_, i) => i + 1)
              .filter((nomor) => nomor === 1 || nomor === totalHalaman || Math.abs(nomor - halamanAktif) <= 1)
              .map((nomor, index, daftar) => (
                <span key={nomor} className="contents">
                  {index > 0 && nomor - daftar[index - 1] > 1 && <span className="px-1 text-[#94A3B8]">…</span>}
                  <button
                    type="button"
                    onClick={() => ubahHalaman(nomor)}
                    aria-current={nomor === halamanAktif ? "page" : undefined}
                    className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[10px] font-semibold ${
                      nomor === halamanAktif ? "bg-[#1D4ED8] text-white" : "text-[#475569] hover:bg-[#EEF3FC]"
                    }`}
                  >
                    {nomor}
                  </button>
                </span>
              ))}
            <button type="button" onClick={() => ubahHalaman(halamanAktif + 1)} disabled={halamanAktif >= totalHalaman} aria-label="Halaman berikutnya" className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E9F0] text-[#475569] disabled:opacity-40">›</button>
          </nav>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl bg-[#1D4ED8] p-4 text-white shadow-[0_4px_12px_rgba(29,78,216,.2)] lg:grid-cols-[1fr_1.1fr] lg:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15"><Ikon nama="shield" ukuran={21} /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">Standar Kelulusan Capaian</h2>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold">Prodi EE · {tahunAjaran}</span>
            </div>
            <p className="mt-1.5 max-w-2xl text-[10px] leading-relaxed text-white/85">
              Skor minimal {passingGrade} memenuhi kriteria ketercapaian CPL Program Studi Teknik Elektro. Nilai di bawah ambang batas ditandai sebagai remedial untuk ditindaklanjuti.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-3">
          <h3 className="mb-2 text-[10px] font-semibold">Indikator Nilai {tugasDipilih?.nama ?? "Tugas"}</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] text-white/90 sm:grid-cols-3">
            {[
              ["90–100", "Sangat Baik (A)"],
              ["75–89.9", "Baik (B)"],
              ["50–74.9", "Cukup (C)"],
              ["30–49.9", "Kurang (D)"],
              ["15–29.9", "Sangat Kurang (E)"],
              ["0–14.9", "Buruk (F)"],
            ].map(([rentang, label]) => (
              <span key={rentang} className="flex items-start gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white" />{rentang} · {label}</span>
            ))}
          </div>
        </div>
      </section>

      {dialogImpor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDialogImpor(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="judul-impor-nilai" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="judul-impor-nilai" className="text-lg font-bold text-[#0F172A]">Import Nilai dari Excel</h2>
                <p className="mt-1 text-xs text-[#64748B]">Gunakan kolom NIM dan Nilai. File akan dipratinjau sebelum dimasukkan ke formulir.</p>
              </div>
              <button type="button" onClick={() => setDialogImpor(false)} aria-label="Tutup dialog" className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9]"><Ikon nama="close" /></button>
            </div>
            {tugasDipilih && (
              <a
                href={`/api/dosen/nilai/template?${new URLSearchParams({
                  mataKuliahId: mataKuliah.id,
                  ...(kelasId ? { kelasId } : {}),
                  tugasId: tugasDipilih.id,
                }).toString()}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#EEF3FC] px-3 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBE7FB]"
              >
                <Ikon nama="file" ukuran={14} />
                Unduh Template Excel berisi daftar mahasiswa
              </a>
            )}
            <label className="mt-4 block rounded-xl border border-dashed border-[#C9D8F7] bg-[#F8FAFC] p-4">
              <span className="mb-2 block text-xs font-semibold text-[#334155]">File Excel (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx"
                onChange={(event) => {
                  setFileImpor(event.target.files?.[0] ?? null);
                  setPratinjauImpor(null);
                  setGalatImpor("");
                }}
                className="block w-full text-xs text-[#475569] file:mr-3 file:rounded-lg file:border-0 file:bg-[#DBE7FB] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1D4ED8]"
              />
            </label>
            {galatImpor && <p role="alert" className="mt-3 rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">{galatImpor}</p>}
            {pratinjauImpor && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <b className="text-[#0F172A]">Pratinjau ({totalImportValid} valid · {pratinjauImpor.length - totalImportValid} galat)</b>
                  <span className="text-[#64748B]">Nilai valid akan mengisi draf, belum tersimpan.</span>
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-[#E5E9F0]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#EEF3FC] text-[10px] uppercase text-[#475569]">
                      <tr><th className="px-3 py-2">Baris</th><th className="px-3 py-2">NIM</th><th className="px-3 py-2">Mahasiswa</th><th className="px-3 py-2">Nilai</th><th className="px-3 py-2">Status</th></tr>
                    </thead>
                    <tbody>
                      {pratinjauImpor.map((baris) => (
                        <tr key={baris.baris} className="border-t border-[#EDF0F4]">
                          <td className="px-3 py-2">{baris.baris}</td>
                          <td className="px-3 py-2 font-mono">{baris.nim || "–"}</td>
                          <td className="px-3 py-2">{baris.nama ?? "–"}</td>
                          <td className="px-3 py-2">{baris.nilai ?? "–"}</td>
                          <td className={`px-3 py-2 ${baris.pesan ? "text-[#B91C1C]" : "font-semibold text-[#15803D]"}`}>{baris.pesan ?? "Valid"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDialogImpor(false)} className="h-10 rounded-xl border border-[#E5E9F0] px-4 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]">Batal</button>
              {pratinjauImpor ? (
                <button type="button" onClick={terapkanImpor} disabled={totalImportValid === 0} className="h-10 rounded-xl bg-[#1D4ED8] px-4 text-xs font-semibold text-white disabled:opacity-50">Gunakan {totalImportValid} Nilai Valid</button>
              ) : (
                <button type="button" onClick={analisisExcel} disabled={!fileImpor || isImporPending} className="h-10 rounded-xl bg-[#1D4ED8] px-4 text-xs font-semibold text-white disabled:opacity-50">
                  {isImporPending ? "Membaca file..." : "Pratinjau Excel"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
