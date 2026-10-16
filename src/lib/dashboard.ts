import { prisma } from "@/lib/prisma";
import type {
  BarAsesmen,
  BarisKesiapan,
  DataDashboard,
  EntriLog,
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

function waktuRelatif(tanggal: Date, sekarang: number) {
  const menit = Math.max(0, Math.floor((sekarang - tanggal.getTime()) / 60000));
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit}m lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam}j lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari}h lalu`;
  return tanggal.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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
  const [totalCPL, totalDosenAkun, hasilCPL, penugasan, pendaftaran, tugas, nilai, distribusi, pengaturan] =
    await Promise.all([
      prisma.cPL.count(),
      prisma.dosen.count(),
      prisma.hasilCPL.findMany({
        where,
        select: { nilai: true, statusLengkap: true, mahasiswa: { select: { angkatan: true } } },
      }),
      prisma.penugasanDosenMK.findMany({
        where,
        include: { dosen: true, mataKuliah: true },
      }),
      prisma.pendaftaranMK.findMany({ where, select: { mahasiswaId: true, mataKuliahId: true } }),
      prisma.tugas.findMany({
        where,
        select: { id: true, nama: true, pertemuanKe: true, mataKuliahId: true, mataKuliah: { select: { nama: true } } },
      }),
      prisma.nilai.findMany({ where, select: { mahasiswaId: true, tugasId: true, skor: true, updatedAt: true } }),
      prisma.distribusiSubCPMK.findMany({
        where: { tugas: { tahunAjaranId: ta.id } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { createdAt: true, tugas: { select: { mataKuliahId: true } } },
      }),
      prisma.pengaturan.findUnique({ where: { kunci: KUNCI_PASSING_GRADE } }),
    ]);

  const sekarang = Date.now();
  const passingGrade = Math.min(100, Math.max(50, Math.round(Number(pengaturan?.nilai)) || PASSING_GRADE_DEFAULT));

  // ---- KPI ----
  const mkAktif = new Map(penugasan.map((p) => [p.mataKuliahId, p.mataKuliah]));
  const mahasiswaAktif = new Set(pendaftaran.map((p) => p.mahasiswaId));
  const dosenAktif = new Set(penugasan.map((p) => p.dosenId));
  const kpi = {
    totalCPL,
    rataCPL: hasilCPL.length ? Math.round(rata(hasilCPL.map((h) => h.nilai))) : null,
    totalDosenAktif: dosenAktif.size,
    totalDosenAkun,
    totalMK: mkAktif.size,
    totalSKS: [...mkAktif.values()].reduce((s, m) => s + m.sks, 0),
    totalMahasiswa: mahasiswaAktif.size,
    persenLengkap: hasilCPL.length
      ? Math.round((hasilCPL.filter((h) => h.statusLengkap).length / hasilCPL.length) * 100)
      : null,
  };

  // ---- Capaian CPL per angkatan ----
  const perAngkatan = new Map<number, number[]>();
  for (const h of hasilCPL) {
    const arr = perAngkatan.get(h.mahasiswa.angkatan) ?? [];
    arr.push(h.nilai);
    perAngkatan.set(h.mahasiswa.angkatan, arr);
  }
  const angkatan: TitikAngkatan[] = [...perAngkatan.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-8)
    .map(([thn, arr]) => ({ angkatan: thn, rata: Math.round(rata(arr) * 10) / 10, jumlah: arr.length }));

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
  const tugasPerMK = new Map<string, string[]>();
  for (const t of tugas) tugasPerMK.set(t.mataKuliahId, [...(tugasPerMK.get(t.mataKuliahId) ?? []), t.id]);
  const terdaftarPerMK = new Map<string, Set<string>>();
  for (const p of pendaftaran) {
    const s = terdaftarPerMK.get(p.mataKuliahId) ?? new Set<string>();
    s.add(p.mahasiswaId);
    terdaftarPerMK.set(p.mataKuliahId, s);
  }
  const nilaiPerMhsTugas = new Set(nilai.map((n) => `${n.mahasiswaId}|${n.tugasId}`));

  const kesiapanSemua: BarisKesiapan[] = penugasan.map((p) => {
    const idTugas = tugasPerMK.get(p.mataKuliahId) ?? [];
    const terdaftar = [...(terdaftarPerMK.get(p.mataKuliahId) ?? [])];
    const terisi = idTugas.length
      ? terdaftar.filter((m) => idTugas.every((t) => nilaiPerMhsTugas.has(`${m}|${t}`))).length
      : 0;
    const persen = terdaftar.length ? Math.round((terisi / terdaftar.length) * 100) : 0;
    const nama = namaDosen(p.dosen);
    return {
      id: p.id,
      dosen: nama,
      inisial: inisial(p.dosen.nama),
      mataKuliah: p.mataKuliah.nama,
      terisi,
      total: terdaftar.length,
      persen,
      ...statusKesiapan(persen),
    };
  });
  kesiapanSemua.sort((a, b) => b.persen - a.persen);
  const jumlahDosenPerluPengingat = new Set(
    penugasan.filter((_, i) => kesiapanSemua.find((k) => k.id === penugasan[i].id)!.persen < 100).map((p) => p.dosenId),
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

  // ---- Log aktivitas (diturunkan dari timestamp Nilai & DistribusiSubCPMK) ----
  const penugasanPerMK = new Map(penugasan.map((p) => [p.mataKuliahId, p]));
  const log: EntriLog[] = [];

  for (const [idTugas, info] of perTugas) {
    const t = tugasById.get(idTugas);
    if (!t) continue;
    const p = penugasanPerMK.get(t.mataKuliahId);
    const total = terdaftarPerMK.get(t.mataKuliahId)?.size ?? 0;
    log.push({
      id: `n-${idTugas}`,
      jenis: "nilai",
      dosen: p ? namaDosen(p.dosen) : "Dosen pengampu",
      inisial: p ? inisial(p.dosen.nama) : "DP",
      teks: `Input nilai ${t.nama} untuk`,
      sorot: `${t.mataKuliah.nama} (${total} Mhs)`,
      waktu: waktuRelatif(info.terbaru, sekarang),
      chip: { teks: `${info.jumlah}/${total} Data Masuk`, nada: "hijau" },
      // dipakai untuk pengurutan, dibuang di bawah
      ...({ _t: info.terbaru.getTime() } as object),
    });
  }

  const perMKDistribusi = new Map<string, { jumlah: number; terbaru: Date }>();
  for (const d of distribusi) {
    const cur = perMKDistribusi.get(d.tugas.mataKuliahId);
    perMKDistribusi.set(d.tugas.mataKuliahId, {
      jumlah: (cur?.jumlah ?? 0) + 1,
      terbaru: !cur || d.createdAt > cur.terbaru ? d.createdAt : cur.terbaru,
    });
  }
  for (const [idMK, info] of perMKDistribusi) {
    const p = penugasanPerMK.get(idMK);
    if (!p) continue;
    log.push({
      id: `r-${idMK}`,
      jenis: "rps",
      dosen: namaDosen(p.dosen),
      inisial: inisial(p.dosen.nama),
      teks: "Memperbarui pemetaan CPMK & Sub-CPMK pada",
      sorot: `${p.mataKuliah.nama} (${p.mataKuliah.kode})`,
      waktu: waktuRelatif(info.terbaru, sekarang),
      chip: { teks: "Konfigurasi CPMK → Sub-CPMK", nada: "biru" },
      ...({ _t: info.terbaru.getTime() } as object),
    });
  }
  log.sort((a, b) => ((b as unknown as { _t: number })._t) - ((a as unknown as { _t: number })._t));
  const logBersih = log.slice(0, 12).map((e) => {
    const { _t, ...sisa } = e as EntriLog & { _t?: number };
    void _t;
    return sisa as EntriLog;
  });

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
    kesiapan: kesiapanSemua.slice(0, 5),
    jumlahDosenPerluPengingat,
    asesmen,
    labelBulanAktif,
    puncakInput,
    log: logBersih,
  };
}
