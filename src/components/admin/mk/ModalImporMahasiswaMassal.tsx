"use client";

import { useRef, useState } from "react";
import { analisisFileImporMassal, type HasilAnalisisFileMassal } from "@/lib/actions/impor-mahasiswa-massal";
import { terapkanImporMahasiswa } from "@/lib/actions/pendaftaran";
import { bacaKodeDariNamaFile, cariFileGanda } from "@/lib/impor-mahasiswa-massal";

type StatusFile = "menunggu" | "memeriksa" | "siap" | "tanpa-baru" | "galat" | "ganda" | "diimpor" | "gagal";

type ItemFile = {
  file: File;
  status: StatusFile;
  analisis: Extract<HasilAnalisisFileMassal, { ok: true }> | null;
  catatan: string[];
};

const MAKS_FILE = 300;

const LABEL: Record<StatusFile, string> = {
  menunggu: "Menunggu",
  memeriksa: "Memeriksa…",
  siap: "Siap diimpor",
  "tanpa-baru": "Tidak ada yang baru",
  galat: "Ada galat — dilewati",
  ganda: "Kode MK ganda — dilewati",
  diimpor: "Terimpor",
  gagal: "Gagal",
};

const WARNA: Record<StatusFile, string> = {
  menunggu: "bg-[#F1F3F5] text-[#4B5563]",
  memeriksa: "bg-[#DCE7FB] text-[#1D4ED8]",
  siap: "bg-[#DCFCE7] text-[#166534]",
  "tanpa-baru": "bg-[#F1F3F5] text-[#4B5563]",
  galat: "bg-[#FEE2E2] text-[#DC2626]",
  ganda: "bg-[#FEE2E2] text-[#DC2626]",
  diimpor: "bg-[#DCFCE7] text-[#166534]",
  gagal: "bg-[#FEE2E2] text-[#DC2626]",
};

export function TombolImporMahasiswaMassal({ onBerhasil }: { onBerhasil: (pesan: string) => void }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex h-10 items-center justify-center gap-2 rounded-full border border-[#E8EAEE] bg-white px-4 text-sm font-semibold text-[#111827] [@media(hover:hover)]:hover:bg-[#EEF3FD]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Impor Mahasiswa Massal
      </button>
      {buka && <ModalMassal onTutup={() => setBuka(false)} onBerhasil={onBerhasil} />}
    </>
  );
}

function ModalMassal({ onTutup, onBerhasil }: { onTutup: () => void; onBerhasil: (pesan: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [daftar, setDaftar] = useState<ItemFile[]>([]);
  const [error, setError] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [sibuk, setSibuk] = useState<"" | "memeriksa" | "menyimpan">("");
  const [kemajuan, setKemajuan] = useState("");
  const [sudahPeriksa, setSudahPeriksa] = useState(false);

  function ubah(indeks: number, perubahan: Partial<ItemFile>) {
    setDaftar((lama) => lama.map((item, i) => (i === indeks ? { ...item, ...perubahan } : item)));
  }

  function pilihFile() {
    const files = Array.from(inputRef.current?.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".xlsx"));
    setError("");
    setRingkasan("");
    setSudahPeriksa(false);
    if (files.length > MAKS_FILE) {
      setError(`Maksimal ${MAKS_FILE} file per impor. Bagi menjadi beberapa kali impor.`);
      setDaftar([]);
      return;
    }
    files.sort((a, b) => a.name.localeCompare(b.name, "id"));
    setDaftar(files.map((file) => ({ file, status: "menunggu", analisis: null, catatan: [] })));
  }

  async function periksaSemua() {
    if (daftar.length === 0) {
      setError("Pilih satu atau beberapa file Excel (.xlsx) terlebih dahulu.");
      return;
    }
    setError("");
    setRingkasan("");
    setSibuk("memeriksa");

    const ganda = cariFileGanda(daftar.map((item) => bacaKodeDariNamaFile(item.file.name)?.kunci ?? null));
    for (let i = 0; i < daftar.length; i++) {
      setKemajuan(`Memeriksa ${i + 1} dari ${daftar.length}…`);
      const { file } = daftar[i];
      if (ganda.has(i)) {
        ubah(i, {
          status: "ganda",
          analisis: null,
          catatan: [`Kode MK sama dengan file "${daftar[ganda.get(i)!].file.name}". Hanya file pertama yang diproses.`],
        });
        continue;
      }
      ubah(i, { status: "memeriksa", analisis: null, catatan: [] });
      const formData = new FormData();
      formData.set("file", file);
      try {
        const hasil = await analisisFileImporMassal(formData);
        if (!hasil.ok) {
          ubah(i, { status: "gagal", catatan: [hasil.error] });
          continue;
        }
        const catatan: string[] = [];
        if (hasil.peringatanJudul) catatan.push(hasil.peringatanJudul);
        if (hasil.galat > 0) {
          for (const baris of hasil.baris.filter((b) => b.status === "galat").slice(0, 3)) {
            catatan.push(`Baris ${baris.baris}: ${baris.pesan.join(" ")}`);
          }
          if (hasil.galat > 3) catatan.push(`…dan ${hasil.galat - 3} baris galat lainnya.`);
        }
        ubah(i, {
          status: hasil.galat > 0 ? "galat" : hasil.baru > 0 ? "siap" : "tanpa-baru",
          analisis: hasil,
          catatan,
        });
      } catch {
        ubah(i, { status: "gagal", catatan: ["Pemeriksaan gagal. Coba lagi."] });
      }
    }
    setKemajuan("");
    setSibuk("");
    setSudahPeriksa(true);
  }

  const siap = daftar.filter((item) => item.status === "siap");
  const totalBaru = siap.reduce((total, item) => total + (item.analisis?.baru ?? 0), 0);
  const dilewati = daftar.filter((item) => ["galat", "gagal", "ganda"].includes(item.status)).length;

  async function terapkan() {
    setError("");
    setRingkasan("");
    setSibuk("menyimpan");
    let berhasil = 0;
    let mahasiswa = 0;
    const urutan = daftar.map((item, indeks) => ({ item, indeks })).filter(({ item }) => item.status === "siap");
    for (let n = 0; n < urutan.length; n++) {
      const { item, indeks } = urutan[n];
      const analisis = item.analisis!;
      setKemajuan(`Menyimpan ${n + 1} dari ${urutan.length} (${analisis.mk.kode})…`);
      try {
        const hasil = await terapkanImporMahasiswa(
          analisis.mk.id,
          analisis.baris.map(({ nim, nama, kelas }) => ({ nim, nama, kelas })),
        );
        if (hasil.error) {
          ubah(indeks, { status: "gagal", catatan: [hasil.error] });
        } else {
          berhasil++;
          mahasiswa += analisis.baru;
          ubah(indeks, { status: "diimpor", catatan: [hasil.pesan ?? ""] });
        }
      } catch {
        ubah(indeks, { status: "gagal", catatan: ["Penyimpanan gagal. Coba lagi."] });
      }
    }
    setKemajuan("");
    setSibuk("");
    const pesan = `Impor massal selesai: ${berhasil} dari ${urutan.length} mata kuliah, ${mahasiswa} pendaftaran baru.`;
    setRingkasan(pesan);
    onBerhasil(pesan);
  }

  const loading = sibuk !== "";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-impor-massal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onTutup();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !loading) onTutup();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="judul-impor-massal" className="text-base font-bold text-[#111827]">
              Impor Mahasiswa Massal
            </h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Pilih banyak file sekaligus, satu file per mata kuliah. Mata kuliah dikenali dari kode di awal nama file
              (mis. <span className="font-semibold">UTM_101_Bahasa_Indonesia.xlsx</span>). Isi tiap file memakai format
              yang sama dengan template impor mahasiswa (NIM, Nama, dan Kelas wajib). Impor hanya menambah pendaftaran.
            </p>
            <a href="/api/admin/mahasiswa/template" download className="mt-1 inline-block text-[13px] font-semibold text-[#2F6BE8] hover:underline">
              Unduh template Excel
            </a>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            aria-label="Tutup"
            className="rounded-full bg-[#F1F3F5] px-3 py-1.5 text-sm text-[#4B5563] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            multiple
            onChange={pilihFile}
            disabled={loading}
            aria-label="Pilih file Excel mahasiswa (boleh banyak)"
            className="block min-w-0 flex-1 text-sm text-[#111827] file:mr-3 file:h-10 file:rounded-[10px] file:border-0 file:bg-[#EEF3FD] file:px-4 file:text-sm file:font-semibold file:text-[#111827]"
          />
          <button
            type="button"
            onClick={periksaSemua}
            disabled={loading || daftar.length === 0}
            className="h-10 rounded-[10px] bg-[#2F6BE8] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sibuk === "memeriksa" ? "Memeriksa…" : `Periksa ${daftar.length || ""} file`}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">
          Di jendela pilih file, tekan Ctrl+A untuk memilih semua file dalam folder. Maksimal {MAKS_FILE} file per impor.
        </p>

        {kemajuan && <p role="status" className="mt-3 text-sm font-semibold text-[#1D4ED8]">{kemajuan}</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">{error}</p>
        )}
        {ringkasan && (
          <p role="status" className="mt-3 rounded-lg bg-[#DCFCE7] px-3 py-2 text-sm text-[#166534]">{ringkasan}</p>
        )}

        {daftar.length > 0 && (
          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[#E8EAEE]">
            <table className="w-full min-w-160 text-left text-xs">
              <thead className="sticky top-0 bg-[#F8FAFC] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2 font-semibold">File</th>
                  <th className="px-3 py-2 font-semibold">Mata kuliah</th>
                  <th className="px-3 py-2 text-right font-semibold">Baru</th>
                  <th className="px-3 py-2 text-right font-semibold">Terdaftar</th>
                  <th className="px-3 py-2 text-right font-semibold">Galat</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((item) => (
                  <tr key={item.file.name} className="border-t border-[#F1F3F5] align-top">
                    <td className="max-w-56 break-all px-3 py-2">{item.file.name}</td>
                    <td className="px-3 py-2">
                      {item.analisis ? `${item.analisis.mk.kode} · ${item.analisis.mk.nama}` : "–"}
                    </td>
                    <td className="px-3 py-2 text-right">{item.analisis?.baru ?? "–"}</td>
                    <td className="px-3 py-2 text-right">{item.analisis?.sudahTerdaftar ?? "–"}</td>
                    <td className="px-3 py-2 text-right">{item.analisis?.galat ?? "–"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${WARNA[item.status]}`}>
                        {LABEL[item.status]}
                      </span>
                      {item.catatan.map((catatan, i) => (
                        <span key={i} className="mt-1 block text-[#6B7280]">{catatan}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sudahPeriksa && !ringkasan && (
          <p className="mt-3 text-sm text-[#4B5563]">
            {siap.length} file siap ({totalBaru} mahasiswa baru)
            {dilewati > 0 ? `, ${dilewati} file dilewati karena galat. Perbaiki lalu periksa ulang, atau impor yang siap dulu.` : "."}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onTutup}
            disabled={loading}
            className="h-11 rounded-[10px] bg-[#EEF3FD] px-6 text-sm font-semibold text-[#111827] disabled:opacity-50"
          >
            {ringkasan ? "Selesai" : "Batal"}
          </button>
          {sudahPeriksa && !ringkasan && siap.length > 0 && (
            <button
              type="button"
              onClick={terapkan}
              disabled={loading}
              className="h-11 rounded-[10px] bg-[#2F6BE8] px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sibuk === "menyimpan" ? "Menyimpan…" : `Impor ${siap.length} file (${totalBaru} mahasiswa)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
