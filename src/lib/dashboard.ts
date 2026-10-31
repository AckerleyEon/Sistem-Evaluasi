import { prisma } from "@/lib/prisma";
import type {
  BarAsesmen,
  BarisKesiapan,
  DataDashboard,
  NadaStatus,
  PredikatKey,
  SegmenPredikat,
  TitikAngkatan,
} from "@/components/admin/dashboard/tipe";

export const KUNCI_PASSING_GRADE = "passingGrade";
export const PASSING_GRADE_DEFAULT = 75;

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const PREDIKAT: { kunci: PredikatKey; label: string; warna: string }[] = [
  { kunci: "A", label: "Predikat A", warna: "#1D4ED8" },
  { kunci: "B+", label: "Predikat B+", warna: "#3B82F6" },
  { kunci: "B", label: "Predikat B", warna: "#60A5FA" },
  { kunci: "C", label: "Predikat C", warna: "#93C5FD" },
  { kunci: "DE", label: "Perlu Remedial (D/E)", warna: "#DC2626" },
];

export function predikatDari(skor: number): PredikatKey {
  if (skor >= 85) return "A";
  if (skor >= 75) return "B+";
  if (skor >= 65) return "B";
  if (skor >= 55) return "C";
  return "DE";
}

export function statusKesiapan(persen: number): { label: string; nada: NadaStatus } {
  if (persen >= 100) return { label: "Selesai", nada: "hijau" };
  if (persen >= 90) return { label: "Siap", nada: "hijau" };
  if (persen >= 75) return { label: "Siap", nada: "biru" };
  if (persen >= 50) return { label: "Berjalan", nada: "oranye" };
  return { label: "Tertunda", nada: "merah" };
}

export function inisial(nama: string) {
  const kata = nama.split(/\s+/).filter((k) => k && !k.endsWith("."));
  return ((kata[0]?.[0] ?? "") + (kata[1]?.[0] ?? "")).toUpperCase() || "?";
}

function namaDosen(d: { nama: string; gelar: string | null }) {
  return d.gelar ? `${d.nama}, ${d.gelar}` : d.nama;
}

const rata = (angka: number[]) => (angka.length ? angka.reduce((a, b) => a + b, 0) / angka.length : 0);

export async function ambilDashboard(taId?: string): Promise<DataDashboard | null> {
  const semuaTA = await prisma.tahunAjaran.findMany({
    orderBy: { label: "desc" },
    select: { id: true, label: true, status: true },
  });
  const ta = semuaTA.find((t) => t.id === taId) ?? semuaTA.find((t) => t.status === "AKTIF") ?? semuaTA[0];
  if (!ta) return null;

  const where = { tahunAjaranId: ta.id };
  const [totalCPL, totalDosenAkun, mahasiswaPerAngkatan, mataKuliahMaster, hasilCPLSemuaTA, penugasan, kelasPengampu, pendaftaran, tugas, nilai, pengaturan] =
    await Promise.all([
      prisma.cPL.count(),
      prisma.dosen.count(),
      prisma.mahasiswa.groupBy({ by: ["angkatan"], orderBy: { angkatan: "asc" } }),
      prisma.mataKuliah.findMany({ select: { id: true, sks: true } }),
      prisma.hasilCPL.findMany({
        select: { nilai: true, statusLengkap: true, tahunAjaranId: true, mahasiswa: { select: { angkatan: true } } },
      }),
      prisma.penugasanDosenMK.findMany({
        where,
        include: { dosen: true, mataKuliah: true },
      }),
      prisma.kelasMK.findMany({
        where,
        select: {
          id: true,
          nama: true,
          mataKuliahId: true,
          dosenId: true,
          dosen: { select: { nama: true, gelar: true } },
          mataKuliah: { select: { id: true, nama: true } },
        },
      }),
      prisma.pendaftaranMK.findMany({
        where,
        select: { mahasiswaId: true, mataKuliahId: true, kelasId: true },
      }),
      prisma.tugas.findMany({
        where,
        select: { id: true, nama: true, pertemuanKe: true, mataKuliahId: true, kelasId: true, mataKuliah: { select: { nama: true } } },
      }),
      prisma.nilai.findMany({ where, select: { mahasiswaId: true, tugasId: true, skor: true, updatedAt: true } }),
      prisma.pengaturan.findUnique({ where: { kunci: KUNCI_PASSING_GRADE } }),
    ]);

  const passingGrade = Math.min(100, Math.max(50, Math.round(Number(pengaturan?.nilai)) || PASSING_GRADE_DEFAULT));
  const hasilCPL = hasilCPLSemuaTA.filter((hasil) => hasil.tahunAjaranId === ta.id);

  // ---- KPI ----
  const mahasiswaAktif = new Set(pendaftaran.map((p) => p.mahasiswaId));
  const dosenAktif = new Set([
    ...penugasan.map((p) => p.dosenId),
    ...kelasPengampu.map((item) => item.dosenId),
  ]);
  const kpi = {
    totalCPL,
    rataCPL: hasilCPL.length ? Math.round(rata(hasilCPL.map((h) => h.nilai))) : null,
    totalDosenAktif: dosenAktif.size,
    totalDosenAkun,
    totalMK: mataKuliahMaster.length,
    totalSKS: mataKuliahMaster.reduce((s, m) => s + m.sks, 0),
    totalMahasiswa: mahasiswaAktif.size,
    persenLengkap: hasilCPL.length
      ? Math.round((hasilCPL.filter((h) => h.statusLengkap).length / hasilCPL.length) * 100)
      : null,
  };

  // ---- Capaian CPL per angkatan ----
  const perAngkatan = new Map<number, number[]>();
  for (const h of hasilCPLSemuaTA) {
    const arr = perAngkatan.get(h.mahasiswa.angkatan) ?? [];
    arr.push(h.nilai);
    perAngkatan.set(h.mahasiswa.angkatan, arr);
  }
  const angkatan: TitikAngkatan[] = mahasiswaPerAngkatan.map(({ angkatan: tahun }) => {
    const hasil = perAngkatan.get(tahun) ?? [];
    return {
      angkatan: tahun,
      rata: hasil.length ? Math.round(rata(hasil) * 10) / 10 : null,
      jumlah: hasil.length,
    };
  });

  // ---- Distribusi predikat (dari skor tugas/UTS) ----
  const histogram = new Array<number>(101).fill(0);
  const hitung: Record<PredikatKey, number> = { A: 0, "B+": 0, B: 0, C: 0, DE: 0 };
  for (const n of nilai) {
    hitung[predikatDari(n.skor)]++;
    histogram[Math.min(100, Math.max(0, Math.round(n.skor)))]++;
  }
  const totalSampel = nilai.length;
  const predikat: SegmenPredikat[] = PREDIKAT.map((p) => ({
    ...p,
    jumlah: hitung[p.kunci],
    persen: totalSampel ? Math.round((hitung[p.kunci] / totalSampel) * 100) : 0,
  }));
  const persenLulus = totalSampel
    ? Math.round((nilai.filter((n) => n.skor >= passingGrade).length / totalSampel) * 100)
    : null;

  // ---- Kesiapan input dosen ----
  const tugasPerKelas = new Map<string, string[]>();
  const terdaftarPerMK = new Map<string, { mahasiswaId: string; kelasId: string }[]>();
  const dosenPerMK = new Map<string, Map<string, string>>();
  const dosenIdsPerMK = new Map<string, Set<string>>();
  const mataKuliahPerMK = new Map<string, { nama: string; dosenIds: Set<string> }>();

  for (const p of penugasan) {
    const mk = mataKuliahPerMK.get(p.mataKuliahId) ?? { nama: p.mataKuliah.nama, dosenIds: new Set<string>() };
    mk.dosenIds.add(p.dosenId);
    mataKuliahPerMK.set(p.mataKuliahId, mk);
    const pengampu = dosenPerMK.get(p.mataKuliahId) ?? new Map<string, string>();
    pengampu.set(p.dosenId, namaDosen(p.dosen));
    dosenPerMK.set(p.mataKuliahId, pengampu);
  }
  for (const kelas of kelasPengampu) {
    const mk = mataKuliahPerMK.get(kelas.mataKuliahId) ?? { nama: kelas.mataKuliah.nama, dosenIds: new Set<string>() };
    mk.dosenIds.add(kelas.dosenId);
    mataKuliahPerMK.set(kelas.mataKuliahId, mk);
    const pengampu = dosenPerMK.get(kelas.mataKuliahId) ?? new Map<string, string>();
    pengampu.set(kelas.dosenId, namaDosen(kelas.dosen));
    dosenPerMK.set(kelas.mataKuliahId, pengampu);
  }
  for (const p of pendaftaran) {
    const s = terdaftarPerMK.get(p.mataKuliahId) ?? [];
    s.push({ mahasiswaId: p.mahasiswaId, kelasId: p.kelasId });
    terdaftarPerMK.set(p.mataKuliahId, s);
  }
  for (const t of tugas) {
    const kunci = `${t.mataKuliahId}:${t.kelasId}`;
    tugasPerKelas.set(kunci, [...(tugasPerKelas.get(kunci) ?? []), t.id]);
  }
  const nilaiPerMhsTugas = new Set(nilai.map((n) => `${n.mahasiswaId}|${n.tugasId}`));

  const kesiapanSemua: BarisKesiapan[] = [...mataKuliahPerMK.entries()].map(([mataKuliahId, mk]) => {
    const terdaftar = terdaftarPerMK.get(mataKuliahId) ?? [];
    const terisi = terdaftar.filter((mahasiswa) => {
      const idTugas = tugasPerKelas.get(`${mataKuliahId}:${mahasiswa.kelasId}`) ?? [];
      return idTugas.length > 0 && idTugas.every((idTugas) => nilaiPerMhsTugas.has(`${mahasiswa.mahasiswaId}|${idTugas}`));
    }).length;
    const persen = terdaftar.length ? Math.round((terisi / terdaftar.length) * 100) : 0;
    const pengampu = [...(dosenPerMK.get(mataKuliahId)?.values() ?? [])].sort((a, b) => a.localeCompare(b, "id"));
    const dosenIds = mk.dosenIds;
    dosenIdsPerMK.set(mataKuliahId, dosenIds);
    return {
      id: mataKuliahId,
      dosen: pengampu.join(", "),
      pengampu,
      inisial: pengampu.length === 1 ? inisial(pengampu[0]) : "MK",
      mataKuliah: mk.nama,
      terisi,
      total: terdaftar.length,
      persen,
      ...statusKesiapan(persen),
    };
  });
  kesiapanSemua.sort((a, b) => a.persen - b.persen || a.mataKuliah.localeCompare(b.mataKuliah, "id"));
  const jumlahDosenPerluPengingat = new Set(
    kesiapanSemua.filter((item) => item.persen < 100).flatMap((item) => [...(dosenIdsPerMK.get(item.id) ?? [])]),
  ).size;

  // ---- Input asesmen per bulan (5 bulan, berakhir di bulan input terakhir) ----
  const jangkar = nilai.length ? new Date(Math.max(...nilai.map((n) => n.updatedAt.getTime()))) : new Date();
  const bulanKunci = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const kunciJangkar = bulanKunci(jangkar);
  const perBulan = new Map<number, number>();
  for (const n of nilai) perBulan.set(bulanKunci(n.updatedAt), (perBulan.get(bulanKunci(n.updatedAt)) ?? 0) + 1);
  const asesmen: BarAsesmen[] = Array.from({ length: 5 }, (_, i) => {
    const k = kunciJangkar - (4 - i);
    return { label: BULAN[((k % 12) + 12) % 12], jumlah: perBulan.get(k) ?? 0, aktif: k === kunciJangkar };
  });
  const labelBulanAktif = `${BULAN[jangkar.getMonth()]} ${jangkar.getFullYear()}`;

  const perTugas = new Map<string, { jumlah: number; terbaru: Date }>();
  for (const n of nilai) {
    const cur = perTugas.get(n.tugasId);
    perTugas.set(n.tugasId, {
      jumlah: (cur?.jumlah ?? 0) + 1,
      terbaru: !cur || n.updatedAt > cur.terbaru ? n.updatedAt : cur.terbaru,
    });
  }
  const tugasById = new Map(tugas.map((t) => [t.id, t]));
  const [idPuncak] = [...perTugas.entries()].sort((a, b) => b[1].jumlah - a[1].jumlah)[0] ?? [];
  const puncak = idPuncak ? tugasById.get(idPuncak) : undefined;
  const puncakInput = puncak ? { nama: puncak.nama, pertemuanKe: puncak.pertemuanKe } : null;

  return {
    tahunAjaran: ta,
    daftarTahunAjaran: semuaTA.map((t) => ({ id: t.id, label: t.label })),
    kpi,
    angkatan,
    predikat,
    totalSampel,
    jumlahRemedial: hitung.DE,
    persenLulus,
    passingGrade,
    histogram,
    kesiapan: kesiapanSemua,
    jumlahDosenPerluPengingat,
    asesmen,
    labelBulanAktif,
    puncakInput,
  };
}
