"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MAKS_BARIS,
  bacaMatriks,
  cariDosen,
  pecahKelas,
  rapikanKode,
  semesterDariTeks,
  type AnalisisImpor,
  type BarisAnalisis,
  type BarisMentah,
  type PilihanSemester,
  type RingkasanImpor,
} from "@/lib/impor-mk";

const MAKS_UKURAN = 2 * 1024 * 1024; // 2 MB
const punyaDataTerkait = (jumlah: {
  cpmk: number;
  subCPMK: number;
  tugas: number;
  pendaftaran: number;
  hasilSubCPMK: number;
  hasilCPMK: number;
}) => Object.values(jumlah).some((nilai) => nilai > 0);

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
): Promise<{ ok: true; baris: BarisMentah[]; semesterTersedia: ("ganjil" | "genap")[] } | { ok: false; pesan: string }> {
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
    for (let c = 1; c <= 10; c++) sel.push(teksSel(row.getCell(c).value));
    matriks[nomor - 1] = sel;
  });
  // eachRow melewatkan indeks kosong -> isi agar nomor baris tetap sesuai
  const rapat = Array.from(matriks, (r) => r ?? []);

  const baris = bacaMatriks(rapat);
  if (baris.length === 0) return { ok: false, pesan: "Tidak ada baris data yang terbaca." };
  if (baris.length > MAKS_BARIS) return { ok: false, pesan: `Maksimal ${MAKS_BARIS} baris per impor.` };

  const jenis = new Set<"ganjil" | "genap">();
  for (const b of baris) {
    const s = semesterDariTeks(b.semester).jenis;
    if (s) jenis.add(s);
  }
  return { ok: true, baris, semesterTersedia: [...jenis] };
}

/** Validasi + cocokkan ke database. Dipakai untuk pratinjau dan juga ulang saat menerapkan. */
export async function analisisImpor(baris: BarisMentah[], semester: PilihanSemester): Promise<AnalisisImpor> {
  const kosong: RingkasanImpor = {
    total: 0, valid: 0, galat: 0, dilewati: 0, mkBaru: 0, mkDiperbarui: 0, kelasBaru: 0, kelasGantiPengampu: 0, kelasSama: 0,
  };
  if (!(await adalahAdmin())) return { tahunAjaran: null, baris: [], ringkasan: kosong, mkTidakAda: [] };
  if (baris.length > MAKS_BARIS) return { tahunAjaran: null, baris: [], ringkasan: kosong, mkTidakAda: [] };

  const ta = await prisma.tahunAjaran.findFirst({ where: { status: "AKTIF" }, select: { id: true, label: true } });
  const dosen = await prisma.dosen.findMany({ select: { id: true, nama: true, gelar: true } });

  const kodeSemua = [...new Set(baris.map((b) => rapikanKode(b.kode)).filter(Boolean))];
  const mkAda = await prisma.mataKuliah.findMany({
    where: { kode: { in: kodeSemua } },
    select: { id: true, kode: true, nama: true, sks: true },
  });
  type MkRef = { id: string; kode: string; nama: string; sks: number };
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
  const infoKode = new Map<string, { nama: string; sks: number | null; baris: number }>();
  const mkBaruDihitung = new Set<string>();
  const mkUbahDihitung = new Set<string>();

  for (const b of baris) {
    const sem = semesterDariTeks(b.semester);
    const kode = rapikanKode(b.kode);
    const nama = b.nama.replace(/\s+/g, " ").trim();
    const sksAngka = /^\d+$/.test(b.sks.trim()) ? Number(b.sks.trim()) : null;
    const kelas = pecahKelas(b.kelas);
    const pesan: string[] = [];

    const dasar: BarisAnalisis = {
      baris: b.baris,
      dosenTeks: b.dosen,
      dosenId: null,
      dosenNama: null,
      semesterTeks: b.semester,
      semesterKe: sem.angka,
      kode,
      nama,
      sks: sksAngka,
      kelas,
      status: "sama",
      pesan,
    };

    if (semester !== "semua" && sem.jenis && sem.jenis !== semester) {
      hasil.push({ ...dasar, status: "dilewati", pesan: [`Semester ${b.semester} tidak dipilih`] });
      ringkasan.dilewati++;
      continue;
    }

    if (!kode) pesan.push("Kode MK kosong");
    if (!nama) pesan.push("Nama mata kuliah kosong");
    if (sksAngka === null || sksAngka < 1 || sksAngka > 10) pesan.push("SKS harus angka 1–10");
    if (kelas.length === 0) pesan.push("Kelas kosong");
    const d = b.dosen ? cariDosen(b.dosen, dosen) : null;
    if (!b.dosen) pesan.push("Nama dosen kosong");
    else if (!d) pesan.push("Dosen tidak ditemukan atau ambigu (cek ejaan nama/gelar, atau tambahkan akunnya dulu)");
    if (b.jumlah && /^\d+$/.test(b.jumlah) && kelas.length > 0 && Number(b.jumlah) !== kelas.length) {
      pesan.push(`Jumlah kelas di file (${b.jumlah}) berbeda dengan daftar kelas (${kelas.length}); daftar kelas yang dipakai`);
    }

    // Konsistensi di dalam file
    const info = infoKode.get(kode);
    if (kode && info && (info.nama.toLowerCase() !== nama.toLowerCase() || info.sks !== sksAngka)) {
      pesan.push(`Nama/SKS berbeda dari baris ${info.baris}; nilai baris ${info.baris} yang dipakai`);
    } else if (kode && !info) {
      infoKode.set(kode, { nama, sks: sksAngka, baris: b.baris });
    }
    const dobel = kelas.find((k) => terlihat.has(`${kode}|${k}`));
    if (dobel) pesan.push(`Kelas ${dobel} untuk ${kode} sudah ada di baris ${terlihat.get(`${kode}|${dobel}`)}`);

    const fatal = pesan.some(
      (p) => !p.startsWith("Jumlah kelas") && !p.startsWith("Nama/SKS berbeda"),
    );
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
    } else if (mk.nama !== acuan.nama || mk.sks !== acuan.sks) {
      status = "diperbarui";
      pesan.push(`Data MK diperbarui: "${mk.nama}" (${mk.sks} SKS) -> "${acuan.nama}" (${acuan.sks} SKS)`);
      if (!mkUbahDihitung.has(kode)) {
        mkUbahDihitung.add(kode);
        ringkasan.mkDiperbarui++;
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

  const kodeDiFile = new Set(baris.map((b) => rapikanKode(b.kode)).filter(Boolean));
  const mkTidakAda =
    semester === "semua"
      ? await prisma.mataKuliah.findMany({
          select: {
            id: true,
            kode: true,
            nama: true,
            _count: {
              select: {
                cpmk: true,
                subCPMK: true,
                tugas: true,
                pendaftaran: true,
                hasilSubCPMK: true,
                hasilCPMK: true,
              },
            },
          },
          orderBy: { kode: "asc" },
        }).then((daftar) =>
          daftar
            .filter((mk) => !kodeDiFile.has(rapikanKode(mk.kode)))
            .map((mk) => ({
              id: mk.id,
              kode: mk.kode,
              nama: mk.nama,
              bisaDihapus: !punyaDataTerkait(mk._count),
            })),
        )
      : [];

  return { tahunAjaran: ta, baris: hasil, ringkasan, mkTidakAda };
}

export async function terapkanImpor(
  baris: BarisMentah[],
  semester: PilihanSemester,
  hapusMKTidakAda = false,
): Promise<{ ok: boolean; pesan: string; ringkasan?: RingkasanImpor }> {
  if (!(await adalahAdmin())) return { ok: false, pesan: "Hanya admin yang boleh mengimpor data." };

  // Analisis diulang di server; data dari client tidak dipercaya.
  const analisis = await analisisImpor(baris, semester);
  if (!analisis.tahunAjaran) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  if (hapusMKTidakAda && semester !== "semua") {
    return { ok: false, pesan: "Pilih impor semua semester sebelum menghapus MK yang tidak ada di file." };
  }
  if (hapusMKTidakAda && analisis.ringkasan.galat > 0) {
    return { ok: false, pesan: "Perbaiki semua baris yang galat sebelum menghapus MK yang tidak ada di file." };
  }
  const tahunAjaranId = analisis.tahunAjaran.id;
  const valid = analisis.baris.filter((b) => b.dosenId && b.status !== "galat" && b.status !== "dilewati");
  if (valid.length === 0) return { ok: false, pesan: "Tidak ada baris valid untuk diimpor." };

  const kodeDiFile = new Set(baris.map((b) => rapikanKode(b.kode)).filter(Boolean));
  const hasilHapus = await prisma.$transaction(
    async (tx) => {
      const mkId = new Map<string, string>();
      const pengampuAwal = new Map<string, string>(); // dosen baris pertama tiap MK

      for (const b of valid) {
        let id = mkId.get(b.kode);
        if (!id) {
          const data = { nama: b.nama, sks: b.sks as number };
          const mk = await tx.mataKuliah.upsert({
            where: { kode: b.kode },
            update: { ...data, ...(b.semesterKe !== null ? { semester: b.semesterKe } : {}) },
            create: { kode: b.kode, ...data, semester: b.semesterKe },
          });
          const idBaru: string = mk.id;
          id = idBaru;
          mkId.set(b.kode, idBaru);
          pengampuAwal.set(b.kode, b.dosenId as string);
        } else if (b.semesterKe !== null) {
          await tx.mataKuliah.update({ where: { id }, data: { semester: b.semesterKe } });
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

      if (!hapusMKTidakAda) return { dihapus: 0, dipertahankan: 0 };

      const semuaMK = await tx.mataKuliah.findMany({
        select: {
          id: true,
          kode: true,
          _count: {
            select: {
              cpmk: true,
              subCPMK: true,
              tugas: true,
              pendaftaran: true,
              hasilSubCPMK: true,
              hasilCPMK: true,
            },
          },
        },
      });
      const hilang = semuaMK.filter((mk) => !kodeDiFile.has(rapikanKode(mk.kode)));
      const amanDihapus = hilang.filter((mk) => !punyaDataTerkait(mk._count));
      if (amanDihapus.length > 0) {
        await tx.mataKuliah.deleteMany({ where: { id: { in: amanDihapus.map((mk) => mk.id) } } });
      }
      return { dihapus: amanDihapus.length, dipertahankan: hilang.length - amanDihapus.length };
    },
    { timeout: 60_000 },
  );

  revalidatePath("/admin/data-master/mata-kuliah");
  return {
    ok: true,
    pesan: `${valid.length} baris diimpor (${analisis.ringkasan.mkBaru} MK baru, ${analisis.ringkasan.kelasBaru} kelas baru).${
      hapusMKTidakAda
        ? ` ${hasilHapus.dihapus} MK tanpa data terkait dihapus, ${hasilHapus.dipertahankan} MK yang masih memiliki data dipertahankan.`
        : ""
    }`,
    ringkasan: analisis.ringkasan,
  };
}
