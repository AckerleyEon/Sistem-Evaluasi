import { prisma } from "@/lib/prisma";
import { hitungSubCPMK } from "./hitungSubCPMK";
import { hitungCPMK } from "./hitungCPMK";
import { hitungCPL } from "./hitungCPL";
import type { HasilHitung } from "./rumus";

export async function hitungUlangMataKuliah(mataKuliahId: string, tahunAjaranId: string) {
  const [pendaftaran, daftarCpmk] = await Promise.all([
    prisma.pendaftaranMK.findMany({ where: { mataKuliahId, tahunAjaranId }, select: { mahasiswaId: true, kelasId: true } }),
    prisma.cPMK.findMany({
      where: { mataKuliahId, tahunAjaranId },
      include: {
        sub: { include: { subCpmk: { include: { distribusi: { include: { tugas: true } } } } } },
      },
    }),
  ]);
  const mahasiswaIds = pendaftaran.map((p) => p.mahasiswaId);
  const kelasPerMhs = new Map(pendaftaran.map((p) => [p.mahasiswaId, p.kelasId]));

  // Tugas per Sub-CPMK (satu Sub-CPMK bisa dipakai beberapa CPMK, jadi dihitung sekali).
  const tugasPerSub = new Map<string, { id: string; bobot: number; kelasId: string | null }[]>();
  for (const c of daftarCpmk) {
    for (const k of c.sub) {
      if (tugasPerSub.has(k.subCpmkId)) continue;
      tugasPerSub.set(
        k.subCpmkId,
        k.subCpmk.distribusi
          .filter((d) => d.tugas.mataKuliahId === mataKuliahId)
          .map((d) => ({ id: d.tugasId, bobot: d.tugas.bobot, kelasId: d.tugas.kelasId }))
      );
    }
  }

  const idTugas = new Set<string>();
  for (const daftar of tugasPerSub.values()) for (const t of daftar) idTugas.add(t.id);

  const nilaiList =
    mahasiswaIds.length > 0 && idTugas.size > 0
      ? await prisma.nilai.findMany({
          where: { tahunAjaranId, mahasiswaId: { in: mahasiswaIds }, tugasId: { in: [...idTugas] } },
        })
      : [];

  const skorPerMhs = new Map<string, Map<string, number>>();
  for (const n of nilaiList) {
    const peta = skorPerMhs.get(n.mahasiswaId) ?? new Map<string, number>();
    peta.set(n.tugasId, n.skor);
    skorPerMhs.set(n.mahasiswaId, peta);
  }

  const barisSub: {
    mahasiswaId: string;
    subCpmkId: string;
    mataKuliahId: string;
    tahunAjaranId: string;
    nilai: number;
    statusLengkap: boolean;
  }[] = [];
  const barisCpmk: {
    mahasiswaId: string;
    cpmkId: string;
    mataKuliahId: string;
    tahunAjaranId: string;
    nilai: number;
    statusLengkap: boolean;
  }[] = [];

  for (const mahasiswaId of mahasiswaIds) {
    const skor = skorPerMhs.get(mahasiswaId) ?? new Map<string, number>();

    const hasilSub = new Map<string, HasilHitung>();
    const kelasId = kelasPerMhs.get(mahasiswaId) ?? null;
    for (const [subId, tugas] of tugasPerSub) {
      const tugasKelas = tugas.filter((t) => t.kelasId === null || t.kelasId === kelasId);
      const hasil = hitungSubCPMK(tugasKelas, skor);
      if (!hasil) continue;
      hasilSub.set(subId, hasil);
      barisSub.push({ mahasiswaId, subCpmkId: subId, mataKuliahId, tahunAjaranId, ...hasil });
    }

    for (const c of daftarCpmk) {
      const hasilCpmk = hitungCPMK(
        c.sub.map((k) => ({ id: k.subCpmkId, bobot: k.bobot })),
        hasilSub
      );
      if (hasilCpmk) barisCpmk.push({ mahasiswaId, cpmkId: c.id, mataKuliahId, tahunAjaranId, ...hasilCpmk });
    }
  }

  // Hapus-lalu-tulis dalam satu transaksi, jadi hasil basi (kaitan diputus, mahasiswa keluar kelas) ikut bersih.
  await prisma.$transaction([
    prisma.hasilSubCPMK.deleteMany({ where: { tahunAjaranId, mataKuliahId } }),
    prisma.hasilCPMK.deleteMany({ where: { tahunAjaranId, mataKuliahId } }),
    prisma.hasilSubCPMK.createMany({ data: barisSub }),
    prisma.hasilCPMK.createMany({ data: barisCpmk }),
  ]);

  await hitungUlangCPL(mahasiswaIds, tahunAjaranId);
}

// CPL bersifat lintas mata kuliah, jadi dihitung dari hasil CPMK di semua mata kuliah yang diikuti mahasiswa.
export async function hitungUlangCPL(mahasiswaIds: string[], tahunAjaranId: string) {
  if (mahasiswaIds.length === 0) return;

  const [pendaftaran, hasilCpmk] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: { mahasiswaId: { in: mahasiswaIds }, tahunAjaranId },
      select: { mahasiswaId: true, mataKuliahId: true },
    }),
    prisma.hasilCPMK.findMany({
      where: { mahasiswaId: { in: mahasiswaIds }, tahunAjaranId },
      select: { mahasiswaId: true, cpmkId: true, nilai: true, statusLengkap: true },
    }),
  ]);

  const idMk = [...new Set(pendaftaran.map((p) => p.mataKuliahId))];
  const semuaCpmk =
    idMk.length > 0
      ? await prisma.cPMK.findMany({
          where: { mataKuliahId: { in: idMk }, tahunAjaranId },
          include: { mataKuliah: { select: { cplTerkait: { select: { cplId: true } } } } },
        })
      : [];

  const cpmkPerMk = new Map<string, typeof semuaCpmk>();
  for (const c of semuaCpmk) {
    const daftar = cpmkPerMk.get(c.mataKuliahId) ?? [];
    daftar.push(c);
    cpmkPerMk.set(c.mataKuliahId, daftar);
  }

  const mkPerMhs = new Map<string, string[]>();
  for (const p of pendaftaran) {
    const daftar = mkPerMhs.get(p.mahasiswaId) ?? [];
    daftar.push(p.mataKuliahId);
    mkPerMhs.set(p.mahasiswaId, daftar);
  }

  const hasilPer = new Map<string, { nilai: number; statusLengkap: boolean }>();
  for (const h of hasilCpmk) hasilPer.set(`${h.mahasiswaId}|${h.cpmkId}`, h);

  const baris: {
    mahasiswaId: string;
    cplId: string;
    tahunAjaranId: string;
    nilai: number;
    statusLengkap: boolean;
  }[] = [];

  for (const mahasiswaId of mahasiswaIds) {
    const perCpl = new Map<
      string,
      { item: { nilai: number; bobot: number; statusLengkap: boolean }[]; adaKosong: boolean }
    >();

    for (const mkId of mkPerMhs.get(mahasiswaId) ?? []) {
      for (const c of cpmkPerMk.get(mkId) ?? []) {
        const hasil = hasilPer.get(`${mahasiswaId}|${c.id}`);
        for (const pemetaan of c.mataKuliah.cplTerkait) {
          const entri = perCpl.get(pemetaan.cplId) ?? { item: [], adaKosong: false };
          if (hasil) entri.item.push({ nilai: hasil.nilai, bobot: c.bobot, statusLengkap: hasil.statusLengkap });
          else entri.adaKosong = true;
          perCpl.set(pemetaan.cplId, entri);
        }
      }
    }

    for (const [cplId, { item, adaKosong }] of perCpl) {
      const hasil = hitungCPL(item);
      if (hasil) {
        baris.push({
          mahasiswaId,
          cplId,
          tahunAjaranId,
          nilai: hasil.nilai,
          statusLengkap: hasil.statusLengkap && !adaKosong,
        });
      }
    }
  }

  await prisma.$transaction([
    prisma.hasilCPL.deleteMany({ where: { mahasiswaId: { in: mahasiswaIds }, tahunAjaranId } }),
    prisma.hasilCPL.createMany({ data: baris }),
  ]);
}