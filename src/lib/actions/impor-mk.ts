"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hitungUlangCPL } from "@/lib/perhitungan/hitungUlangMataKuliah";
import {
  MAKS_BARIS,
  bacaMatriks,
  cariDosen,
  pecahKelas,
  rapikanKode,
  type AnalisisImpor,
  type BarisAnalisis,
  type BarisMentah,
  type RingkasanImpor,
} from "@/lib/impor-mk";

const MAKS_UKURAN = 2 * 1024 * 1024; // 2 MB

async function adalahAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

function teksSel(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return v.result === null || v.result === undefined ? "" : String(v.result);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
}

export async function bacaFileImpor(
  formData: FormData,
): Promise<{ ok: true; baris: BarisMentah[] } | { ok: false; pesan: string }> {
  if (!(await adalahAdmin())) return { ok: false, pesan: "Hanya admin yang boleh mengimpor data." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, pesan: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, pesan: "Format harus .xlsx. Simpan ulang file Excel-mu sebagai .xlsx." };
  if (file.size > MAKS_UKURAN) return { ok: false, pesan: "Ukuran file maksimal 2 MB." };

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, pesan: "File tidak bisa dibaca. Pastikan itu file .xlsx yang valid." };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { ok: false, pesan: "File tidak punya lembar kerja." };

  const matriks: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, nomor) => {
    const sel: string[] = [];
    for (let c = 1; c <= Math.max(ws.columnCount, 12); c++) sel.push(teksSel(row.getCell(c).value));
    matriks[nomor - 1] = sel;
  });
  // eachRow melewatkan indeks kosong -> isi agar nomor baris tetap sesuai
  const rapat = Array.from(matriks, (r) => r ?? []);

  const baris = bacaMatriks(rapat);
  if (baris.length === 0) return { ok: false, pesan: "Tidak ada baris data yang terbaca." };
  if (baris.length > MAKS_BARIS) return { ok: false, pesan: `Maksimal ${MAKS_BARIS} baris per impor.` };

  return { ok: true, baris };
}

/** Validasi + cocokkan ke database. Dipakai untuk pratinjau dan juga ulang saat menerapkan. */
export async function analisisImpor(baris: BarisMentah[]): Promise<AnalisisImpor> {
  const kosong: RingkasanImpor = {
    total: 0, valid: 0, galat: 0, mkBaru: 0, mkDiperbarui: 0, kelasBaru: 0, kelasGantiPengampu: 0, kelasSama: 0,
  };
  if (!(await adalahAdmin())) return { tahunAjaran: null, baris: [], ringkasan: kosong };
  if (baris.length > MAKS_BARIS) return { tahunAjaran: null, baris: [], ringkasan: kosong };

  const ta = await prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" }, select: { id: true, label: true } });
  const [dosen, cplMaster] = await Promise.all([
    prisma.dosen.findMany({ select: { id: true, nama: true, gelar: true, alias: true } }),
    prisma.cPL.findMany({ select: { id: true, kode: true } }),
  ]);
  const cplPerKode = new Map(cplMaster.map((cpl) => [cpl.kode.toUpperCase(), cpl]));

  const kodeSemua = [...new Set(baris.map((b) => rapikanKode(b.kode)).filter(Boolean))];
  const mkAda = await prisma.mataKuliah.findMany({
    where: { kode: { in: kodeSemua } },
    select: { id: true, kode: true, nama: true, sks: true, cplTerkait: { select: { cplId: true } } },
  });
  type MkRef = { id: string; kode: string; nama: string; sks: number; cplTerkait: { cplId: string }[] };
  const mkPerKode = new Map<string, MkRef>((mkAda as MkRef[]).map((m): [string, MkRef] => [m.kode, m]));
  const kelasAda = ta
    ? await prisma.kelasMK.findMany({
        where: { tahunAjaranId: ta.id, mataKuliahId: { in: (mkAda as MkRef[]).map((m) => m.id) } },
        select: { mataKuliahId: true, nama: true, dosenId: true },
      })
    : [];
  const kelasPerKunci = new Map(kelasAda.map((k) => [`${k.mataKuliahId}|${k.nama}`, k.dosenId]));

  const ringkasan: RingkasanImpor = { ...kosong, total: baris.length };
  const hasil: BarisAnalisis[] = [];
  const terlihat = new Map<string, number>(); // "KODE|KELAS" -> nomor baris pertama
  const infoKode = new Map<string, { nama: string; sks: number | null; baris: number; cpl: string[] | null }>();
  const mkBaruDihitung = new Set<string>();
  const mkUbahDihitung = new Set<string>();

  for (const b of baris) {
    const kode = rapikanKode(b.kode);
    const nama = b.nama.replace(/\s+/g, " ").trim();
    const sksAngka = /^\d+$/.test(b.sks.trim()) ? Number(b.sks.trim()) : null;
    const kelas = pecahKelas(b.kelas);
    const cpl = [...new Set(b.cpl.split(",").map((kode) => kode.trim().toUpperCase()).filter(Boolean))];
    const pesan: string[] = [];

    const dasar: BarisAnalisis = {
      baris: b.baris,
      dosenTeks: b.dosen,
      dosenId: null,
      dosenNama: null,
      kode,
      nama,
      sks: sksAngka,
      kelas,
      cpl,
      cplIds: [],
      cplDiatur: b.cplAdaKolom === true,
      status: "sama",
      pesan,
    };

    if (!kode) pesan.push("Kode MK kosong");
    if (!nama) pesan.push("Nama mata kuliah kosong");
    if (sksAngka === null || sksAngka < 1 || sksAngka > 10) pesan.push("SKS harus angka 1–10");
    if (kelas.length === 0) pesan.push("Kelas kosong");
    const d = b.dosen ? cariDosen(b.dosen, dosen) : null;
    if (!b.dosen) pesan.push("Nama dosen kosong");
    else if (!d) pesan.push("Dosen tidak ditemukan atau ambigu (cek ejaan nama/gelar, atau tambahkan akunnya dulu)");
    if (!b.cplNilaiValid) pesan.push("Nilai pemetaan CPL harus 1, 0, X, Ya, atau kosong");
    const cplIds = cpl.map((kode) => cplPerKode.get(kode)?.id ?? "");
    const cplTidakDikenal = cpl.filter((kode) => !cplPerKode.has(kode));
    if (cplTidakDikenal.length) pesan.push(`Kode CPL tidak ditemukan: ${cplTidakDikenal.join(", ")}`);
    dasar.cplIds = cplIds.filter(Boolean);
    if (b.jumlah && /^\d+$/.test(b.jumlah) && kelas.length > 0 && Number(b.jumlah) !== kelas.length) {
      pesan.push(`Jumlah kelas di file (${b.jumlah}) berbeda dengan daftar kelas (${kelas.length}); daftar kelas yang dipakai`);
    }

    // Konsistensi di dalam file
    const info = infoKode.get(kode);
    if (kode && info && (info.nama.toLowerCase() !== nama.toLowerCase() || info.sks !== sksAngka)) {
      pesan.push(`Nama/SKS berbeda dari baris ${info.baris}; nilai baris ${info.baris} yang dipakai`);
    }
    if (kode && info && b.cplAdaKolom && info.cpl && info.cpl.join() !== cpl.join()) {
      pesan.push(`Pemetaan CPL berbeda dari baris ${info.baris}; gunakan pemetaan yang sama untuk satu mata kuliah`);
    }
    if (kode && !info) {
      infoKode.set(kode, { nama, sks: sksAngka, baris: b.baris, cpl: b.cplAdaKolom ? cpl : null });
    }
    const dobel = kelas.find((k) => terlihat.has(`${kode}|${k}`));
    if (dobel) pesan.push(`Kelas ${dobel} untuk ${kode} sudah ada di baris ${terlihat.get(`${kode}|${dobel}`)}`);

    const fatal = pesan.some((p) => !p.startsWith("Jumlah kelas") && !p.startsWith("Nama/SKS berbeda"));
    if (!ta) {
      hasil.push({ ...dasar, dosenId: d?.id ?? null, dosenNama: d?.nama ?? null, status: "galat", pesan: [...pesan, "Belum ada tahun ajaran aktif"] });
      ringkasan.galat++;
      continue;
    }
    if (fatal) {
      hasil.push({ ...dasar, dosenId: d?.id ?? null, dosenNama: d?.nama ?? null, status: "galat" });
      ringkasan.galat++;
      continue;
    }

    for (const k of kelas) terlihat.set(`${kode}|${k}`, b.baris);

    const acuan = infoKode.get(kode)!;
    const mk = mkPerKode.get(kode);
    let status: BarisAnalisis["status"] = "sama";
    if (!mk) {
      status = "baru";
      if (!mkBaruDihitung.has(kode)) {
        mkBaruDihitung.add(kode);
        ringkasan.mkBaru++;
      }
    } else {
      const cplBerbeda =
        b.cplAdaKolom &&
        mk.cplTerkait.map((tautan) => tautan.cplId).sort().join() !== [...dasar.cplIds].sort().join();
      const dataBerbeda = mk.nama !== acuan.nama || mk.sks !== acuan.sks;
      if (dataBerbeda || cplBerbeda) {
        status = "diperbarui";
        if (dataBerbeda) pesan.push(`Data MK diperbarui: "${mk.nama}" (${mk.sks} SKS) -> "${acuan.nama}" (${acuan.sks} SKS)`);
        if (cplBerbeda) pesan.push("Pemetaan CPL mata kuliah akan diperbarui");
        if (!mkUbahDihitung.has(kode)) {
          mkUbahDihitung.add(kode);
          ringkasan.mkDiperbarui++;
        }
      }
    }
    for (const k of kelas) {
      const lama = mk ? kelasPerKunci.get(`${mk.id}|${k}`) : undefined;
      if (lama === undefined) ringkasan.kelasBaru++;
      else if (lama !== d!.id) {
        ringkasan.kelasGantiPengampu++;
        pesan.push(`Kelas ${k}: pengampu diganti`);
        if (status === "sama") status = "diperbarui";
      } else ringkasan.kelasSama++;
    }

    ringkasan.valid++;
    hasil.push({ ...dasar, dosenId: d!.id, dosenNama: d!.nama, status, pesan });
  }

  return { tahunAjaran: ta, baris: hasil, ringkasan };
}

export async function terapkanImpor(
  baris: BarisMentah[],
): Promise<{ ok: boolean; pesan: string; ringkasan?: RingkasanImpor }> {
  if (!(await adalahAdmin())) return { ok: false, pesan: "Hanya admin yang boleh mengimpor data." };

  // Analisis diulang di server; data dari client tidak dipercaya.
  const analisis = await analisisImpor(baris);
  if (!analisis.tahunAjaran) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const tahunAjaranId = analisis.tahunAjaran.id;
  const valid = analisis.baris.filter((b) => b.dosenId && b.status !== "galat");
  if (valid.length === 0) return { ok: false, pesan: "Tidak ada baris valid untuk diimpor." };

  const cplBerubah = new Set<string>();
  await prisma.$transaction(
    async (tx) => {
      const mkId = new Map<string, string>();
      const pengampuAwal = new Map<string, string>(); // dosen baris pertama tiap MK

      for (const b of valid) {
        let id = mkId.get(b.kode);
        if (!id) {
          const data = { nama: b.nama, sks: b.sks as number };
          const mk = await tx.mataKuliah.upsert({
            where: { kode: b.kode },
            update: data,
            create: { kode: b.kode, ...data },
            include: { cplTerkait: { select: { cplId: true } } },
          });
          const idBaru: string = mk.id;
          id = idBaru;
          mkId.set(b.kode, idBaru);
          pengampuAwal.set(b.kode, b.dosenId as string);

          if (b.cplDiatur) {
            const lama = mk.cplTerkait.map((tautan) => tautan.cplId).sort();
            const baru = [...b.cplIds].sort();
            if (lama.join() !== baru.join()) {
              await tx.mataKuliahCpl.deleteMany({ where: { mataKuliahId: idBaru } });
              if (baru.length) {
                await tx.mataKuliahCpl.createMany({
                  data: baru.map((cplId) => ({ mataKuliahId: idBaru, cplId })),
                });
              }
              cplBerubah.add(idBaru);
            }
          }
        }

        for (const nama of b.kelas) {
          await tx.kelasMK.upsert({
            where: { mataKuliahId_tahunAjaranId_nama: { mataKuliahId: id, tahunAjaranId, nama } },
            update: { dosenId: b.dosenId as string },
            create: { mataKuliahId: id, tahunAjaranId, nama, dosenId: b.dosenId as string },
          });
        }
      }

      // Penugasan MK (pemilik rancangan asesmen) dibuat bila belum ada; tidak menimpa yang sudah ada.
      for (const [kode, id] of mkId) {
        const ada = await tx.penugasanDosenMK.findUnique({
          where: { mataKuliahId_tahunAjaranId: { mataKuliahId: id, tahunAjaranId } },
        });
        if (!ada) {
          await tx.penugasanDosenMK.create({
            data: { mataKuliahId: id, tahunAjaranId, dosenId: pengampuAwal.get(kode) as string },
          });
        }
      }

    },
    { timeout: 60_000 },
  );

  if (cplBerubah.size) {
    const pendaftaran = await prisma.pendaftaranMK.findMany({
      where: { mataKuliahId: { in: [...cplBerubah] } },
      select: { mahasiswaId: true, tahunAjaranId: true },
    });
    const mahasiswaPerTahun = new Map<string, Set<string>>();
    for (const row of pendaftaran) {
      const mahasiswa = mahasiswaPerTahun.get(row.tahunAjaranId) ?? new Set<string>();
      mahasiswa.add(row.mahasiswaId);
      mahasiswaPerTahun.set(row.tahunAjaranId, mahasiswa);
    }
    for (const [tahunAjaranId, mahasiswa] of mahasiswaPerTahun) {
      await hitungUlangCPL([...mahasiswa], tahunAjaranId);
    }
  }

  revalidatePath("/admin/data-master/mata-kuliah");
  revalidatePath("/admin/data-master/cpl");
  revalidatePath("/admin/laporan");
  return {
    ok: true,
    pesan: `${valid.length} baris diimpor (${analisis.ringkasan.mkBaru} MK baru, ${analisis.ringkasan.kelasBaru} kelas baru).`,
    ringkasan: analisis.ringkasan,
  };
}
