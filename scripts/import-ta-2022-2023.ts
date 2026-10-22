import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { cariDosen, pecahKelas } from "../src/lib/impor-mk";
import { hitungUlangCPL } from "../src/lib/perhitungan/hitungUlangMataKuliah";
import { prisma as prismaApp } from "../src/lib/prisma";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DATA_SEBARAN = "public/Sebaran-CPL.xlsx";
const DATA_PENAWARAN = "public/Data-uji-mk.xlsx";
const LABEL_TA = "2022/2023";

type DataMK = { nama: string; sks: number; cpl: number[] };
type Penawaran = {
  baris: number;
  dosen: string;
  kode: string;
  nama: string;
  sks: number | null;
  kelas: string;
};

function teks(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    if ("text" in value) return value.text;
    return "";
  }
  return String(value);
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function bacaSebaran() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(DATA_SEBARAN);
  const sheet = workbook.getWorksheet("DATA MK");
  if (!sheet) throw new Error(`Sheet "DATA MK" tidak ditemukan dalam ${DATA_SEBARAN}.`);

  const courses = new Map<string, DataMK>();
  sheet.eachRow((row, index) => {
    if (index < 5) return;
    const nama = teks(row.getCell(1).value).replace(/\s+/g, " ").trim();
    const sks = Number(row.getCell(2).value);
    if (!nama || !Number.isInteger(sks) || sks < 1 || sks > 6) return;
    const key = normalizeName(nama);
    if (courses.has(key)) throw new Error(`Nama mata kuliah ganda pada Sebaran-CPL.xlsx: ${nama}.`);
    courses.set(key, {
      nama,
      sks,
      cpl: Array.from({ length: 6 }, (_, i) => (Number(row.getCell(i + 3).value) === 1 ? i + 1 : null))
        .filter((value): value is number => value !== null),
    });
  });
  return courses;
}

async function bacaPenawaran(): Promise<Penawaran[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(DATA_PENAWARAN);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`Tidak ada worksheet dalam ${DATA_PENAWARAN}.`);

  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const key = teks(cell.value).trim().toLowerCase();
    if (key === "dosen" || key.includes("pengampu")) headers.set("dosen", column);
    if (key.includes("kode")) headers.set("kode", column);
    if (key.includes("mata kuliah") || key.includes("matakuliah")) headers.set("nama", column);
    if (key === "sks") headers.set("sks", column);
    if (key.includes("kelas") && !key.includes("jumlah")) headers.set("kelas", column);
  });
  if (["dosen", "kode", "nama", "sks", "kelas"].some((key) => !headers.has(key))) {
    throw new Error("Header Data-uji-mk.xlsx harus memuat Dosen, Kode MK, Nama Mata Kuliah, SKS, dan Kelas.");
  }

  const offers: Penawaran[] = [];
  sheet.eachRow((row, baris) => {
    if (baris === 1) return;
    const kode = teks(row.getCell(headers.get("kode")!).value).trim().toUpperCase();
    const nama = teks(row.getCell(headers.get("nama")!).value).replace(/\s+/g, " ").trim();
    const sksMentah = Number(teks(row.getCell(headers.get("sks")!).value));
    const sks = Number.isInteger(sksMentah) ? sksMentah : null;
    const kelas = teks(row.getCell(headers.get("kelas")!).value).trim();
    if (!kode && !nama && !kelas) return;
    offers.push({ baris, dosen: teks(row.getCell(headers.get("dosen")!).value).trim(), kode, nama, sks, kelas });
  });
  return offers;
}

async function main() {
  const [sebaran, offers, dosen, taList, cplMaster] = await Promise.all([
    bacaSebaran(),
    bacaPenawaran(),
    prisma.dosen.findMany({ select: { id: true, nama: true, gelar: true, alias: true } }),
    prisma.tahunAjaran.findMany({ where: { label: { startsWith: LABEL_TA } }, select: { id: true, label: true } }),
    prisma.cPL.findMany({ where: { kode: { in: Array.from({ length: 6 }, (_, i) => `CPL-${i + 1}`) } }, select: { id: true, kode: true } }),
  ]);
  if (taList.length !== 1) {
    throw new Error(`Diharapkan tepat satu Tahun Ajaran dengan label diawali ${LABEL_TA}; ditemukan ${taList.length}.`);
  }
  if (cplMaster.length !== 6) throw new Error("Master CPL-1 sampai CPL-6 harus tersedia sebelum impor.");
  const ta = taList[0];
  const cplIds = new Map(cplMaster.map((cpl) => [Number(cpl.kode.slice(4)), cpl.id]));

  const matched: { penawaran: Penawaran; mk: DataMK; dosenId: string; dosenNama: string; kelas: string[] }[] = [];
  const namaTidakCocok = new Set<string>();
  const namaSebaranDitemukan = new Set<string>();
  const pengampuTidakCocok = new Map<string, number>();
  const namaPerKode = new Map<string, string>();
  const courseByCode = new Map<string, DataMK>();
  let offerMatched = 0;
  let lecturerUnmatched = 0;
  for (const penawaran of offers) {
    const mk = sebaran.get(normalizeName(penawaran.nama));
    if (!mk) {
      namaTidakCocok.add(penawaran.nama);
      continue;
    }
    offerMatched++;
    namaSebaranDitemukan.add(normalizeName(mk.nama));
    if (!penawaran.kode || pecahKelas(penawaran.kelas).length === 0) {
      throw new Error(`Kode atau kelas kosong pada baris ${penawaran.baris} Data-uji-mk.xlsx.`);
    }
    const kodeNama = namaPerKode.get(penawaran.kode);
    if (kodeNama && normalizeName(kodeNama) !== normalizeName(mk.nama)) {
      throw new Error(`Kode ${penawaran.kode} menunjuk ke lebih dari satu mata kuliah pada file.`);
    }
    namaPerKode.set(penawaran.kode, mk.nama);
    courseByCode.set(penawaran.kode, mk);
    const dosenCocok = cariDosen(penawaran.dosen, dosen);
    if (!dosenCocok) {
      lecturerUnmatched++;
      pengampuTidakCocok.set(penawaran.dosen || "(kosong)", (pengampuTidakCocok.get(penawaran.dosen || "(kosong)") ?? 0) + 1);
      continue;
    }
    matched.push({
      penawaran,
      mk,
      dosenId: dosenCocok.id,
      dosenNama: dosenCocok.nama,
      kelas: pecahKelas(penawaran.kelas),
    });
  }

  const kelasUnik = new Map<string, (typeof matched)[number]>();
  const konflikKelas: string[] = [];
  for (const row of matched) {
    for (const kelas of row.kelas) {
      const key = `${row.penawaran.kode}|${kelas}`;
      const sebelumnya = kelasUnik.get(key);
      if (!sebelumnya) kelasUnik.set(key, row);
      else if (sebelumnya.dosenId !== row.dosenId) {
        konflikKelas.push(`${row.penawaran.kode} kelas ${kelas}: dipilih ${sebelumnya.dosenNama}, diabaikan ${row.dosenNama} (baris ${row.penawaran.baris})`);
      }
    }
  }
  const pjmkPertama = new Map<string, string>();
  for (const row of matched) {
    if (!pjmkPertama.has(row.penawaran.kode)) pjmkPertama.set(row.penawaran.kode, row.dosenId);
  }

  const [jumlahKelas, jumlahPendaftaran, jumlahCPMK, jumlahSub, jumlahTugas, jumlahNilai] = await Promise.all([
    prisma.kelasMK.count({ where: { tahunAjaranId: ta.id } }),
    prisma.pendaftaranMK.count({ where: { tahunAjaranId: ta.id } }),
    prisma.cPMK.count({ where: { tahunAjaranId: ta.id } }),
    prisma.subCPMK.count({ where: { tahunAjaranId: ta.id } }),
    prisma.tugas.count({ where: { tahunAjaranId: ta.id } }),
    prisma.nilai.count({ where: { tahunAjaranId: ta.id } }),
  ]);

  console.log(`Tahun Ajaran: ${ta.label}`);
  console.log(`Baris penawaran: ${offers.length}; baris cocok dengan Sebaran-CPL: ${offerMatched}; baris pengampu tervalidasi: ${matched.length}; kode MK unik: ${courseByCode.size}; kelas baru: ${kelasUnik.size}`);
  console.log(`MK Sebaran-CPL tanpa pasangan di Data-uji (${[...sebaran.keys()].filter((key) => !namaSebaranDitemukan.has(key)).length}): ${
    [...sebaran].filter(([key]) => !namaSebaranDitemukan.has(key)).map(([, mk]) => mk.nama).sort().join("; ")
  }`);
  console.log(`Nama penawaran Data-uji tanpa pasangan di Sebaran-CPL (${namaTidakCocok.size}): ${[...namaTidakCocok].sort().join("; ")}`);
  console.log(`Baris cocok yang pengampunya belum cocok ke akun/alias dosen: ${lecturerUnmatched}`);
  for (const [nama, jumlah] of [...pengampuTidakCocok].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`- Pengampu belum dipetakan: ${nama} (${jumlah} baris)`);
  }
  console.log(`Konflik pengampu kelas; baris valid pertama dipakai (${konflikKelas.length}):`);
  for (const konflik of konflikKelas) console.log(`- ${konflik}`);
  console.log("Konflik SKS; nilai Sebaran-CPL dipakai:");
  const sksConflict = new Set<string>();
  for (const row of offers) {
    const mk = sebaran.get(normalizeName(row.nama));
    if (mk && row.sks !== null && row.sks !== mk.sks) {
      sksConflict.add(`${row.kode} ${row.nama}: Data-uji ${row.sks} SKS -> Sebaran ${mk.sks} SKS`);
    }
  }
  for (const conflict of sksConflict) console.log(`- ${conflict}`);
  console.log(`Kondisi TA sebelum impor: kelas=${jumlahKelas}, pendaftaran=${jumlahPendaftaran}, CPMK=${jumlahCPMK}, Sub-CPMK=${jumlahSub}, tugas=${jumlahTugas}, nilai=${jumlahNilai}.`);

  if (process.argv.includes("--verify")) {
    const [kelasTersimpan, penugasanTersimpan, daftarTersimpan, cpmkTersimpan, subTersimpan, tugasTersimpan, nilaiTersimpan, mkTersimpan] =
      await Promise.all([
        prisma.kelasMK.findMany({
          where: { tahunAjaranId: ta.id },
          select: { mataKuliah: { select: { kode: true } }, nama: true, dosenId: true },
        }),
        prisma.penugasanDosenMK.findMany({
          where: { tahunAjaranId: ta.id },
          select: { mataKuliah: { select: { kode: true } }, dosenId: true },
        }),
        prisma.pendaftaranMK.count({ where: { tahunAjaranId: ta.id } }),
        prisma.cPMK.count({ where: { tahunAjaranId: ta.id } }),
        prisma.subCPMK.count({ where: { tahunAjaranId: ta.id } }),
        prisma.tugas.count({ where: { tahunAjaranId: ta.id } }),
        prisma.nilai.count({ where: { tahunAjaranId: ta.id } }),
        prisma.mataKuliah.findMany({
          where: { kode: { in: [...courseByCode.keys()] } },
          select: { id: true, kode: true, nama: true, sks: true, cplTerkait: { select: { cplId: true } } },
        }),
      ]);
    const errors: string[] = [];
    if (kelasTersimpan.length !== kelasUnik.size) errors.push(`kelas ${kelasTersimpan.length}/${kelasUnik.size}`);
    if (penugasanTersimpan.length !== pjmkPertama.size) errors.push(`penugasan ${penugasanTersimpan.length}/${pjmkPertama.size}`);
    if (daftarTersimpan + cpmkTersimpan + subTersimpan + tugasTersimpan + nilaiTersimpan !== 0) {
      errors.push(`data operasional: pendaftaran=${daftarTersimpan}, CPMK=${cpmkTersimpan}, Sub-CPMK=${subTersimpan}, tugas=${tugasTersimpan}, nilai=${nilaiTersimpan}`);
    }

    const kelasTerkini = new Map(kelasTersimpan.map((kelas) => [`${kelas.mataKuliah.kode}|${kelas.nama}`, kelas.dosenId]));
    for (const [key, row] of kelasUnik) {
      if (kelasTerkini.get(key) !== row.dosenId) errors.push(`pengampu kelas ${key} tidak sesuai`);
    }
    const penugasanTerkini = new Map(penugasanTersimpan.map((row) => [row.mataKuliah.kode, row.dosenId]));
    for (const [kode, dosenId] of pjmkPertama) {
      if (penugasanTerkini.get(kode) !== dosenId) errors.push(`PJMK ${kode} tidak sesuai`);
    }
    const mkByCode = new Map(mkTersimpan.map((mk) => [mk.kode, mk]));
    for (const [kode, source] of courseByCode) {
      const mk = mkByCode.get(kode);
      const expectedCpl = source.cpl.map((nomor) => cplIds.get(nomor)!).sort();
      const actualCpl = mk?.cplTerkait.map((item) => item.cplId).sort() ?? [];
      if (!mk || mk.nama !== source.nama || mk.sks !== source.sks || actualCpl.join() !== expectedCpl.join()) {
        errors.push(`data MK/SKS/pemetaan CPL ${kode} tidak sesuai sumber`);
      }
    }

    if (errors.length) throw new Error(`Verifikasi TA 2022/2023 gagal: ${errors.join("; ")}`);
    console.log(`Verifikasi berhasil: ${mkTersimpan.length} MK, ${kelasTersimpan.length} kelas, ${penugasanTersimpan.length} penugasan, 0 pendaftaran dan nilai.`);
    return;
  }

  if (!process.argv.includes("--apply")) {
    console.log("Mode pratinjau. Jalankan ulang dengan --apply untuk menerapkan perubahan.");
    return;
  }
  if (jumlahPendaftaran + jumlahCPMK + jumlahSub + jumlahTugas + jumlahNilai > 0) {
    throw new Error("Impor dibatalkan: TA target memiliki data operasional. Skrip ini hanya mengganti kelas dan penugasan dosen.");
  }
  if (courseByCode.size === 0 || kelasUnik.size === 0) throw new Error("Tidak ada mata kuliah/kelas valid untuk diimpor.");

  const mataKuliahIds = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    await tx.penugasanDosenMK.deleteMany({ where: { tahunAjaranId: ta.id } });
    await tx.kelasMK.deleteMany({ where: { tahunAjaranId: ta.id } });

    for (const [kode, mk] of courseByCode) {
      const record = await tx.mataKuliah.upsert({
        where: { kode },
        update: { nama: mk.nama, sks: mk.sks },
        create: { kode, nama: mk.nama, sks: mk.sks },
        select: { id: true },
      });
      mataKuliahIds.set(kode, record.id);
      await tx.mataKuliahCpl.deleteMany({ where: { mataKuliahId: record.id } });
      if (mk.cpl.length) {
        await tx.mataKuliahCpl.createMany({
          data: mk.cpl.map((nomor) => ({ mataKuliahId: record.id, cplId: cplIds.get(nomor)! })),
        });
      }
    }

    for (const [kode, dosenId] of pjmkPertama) {
      const mataKuliahId = mataKuliahIds.get(kode);
      if (mataKuliahId) {
        await tx.penugasanDosenMK.create({ data: { mataKuliahId, dosenId, tahunAjaranId: ta.id } });
      }
    }

    const dataKelas = [...kelasUnik].map(([key, row]) => {
      const [kode, nama] = key.split("|");
      const mataKuliahId = mataKuliahIds.get(kode);
      if (!mataKuliahId) throw new Error(`Mata kuliah ${kode} belum tersedia saat membuat kelas.`);
      return { mataKuliahId, tahunAjaranId: ta.id, nama, dosenId: row.dosenId };
    });
    await tx.kelasMK.createMany({ data: dataKelas });
  }, { timeout: 60_000, maxWait: 10_000 });

  const pendaftaranTerkait = await prisma.pendaftaranMK.findMany({
    where: { mataKuliahId: { in: [...mataKuliahIds.values()] } },
    select: { mahasiswaId: true, tahunAjaranId: true },
  });
  const mahasiswaPerTahun = new Map<string, Set<string>>();
  for (const row of pendaftaranTerkait) {
    const mahasiswa = mahasiswaPerTahun.get(row.tahunAjaranId) ?? new Set<string>();
    mahasiswa.add(row.mahasiswaId);
    mahasiswaPerTahun.set(row.tahunAjaranId, mahasiswa);
  }
  for (const [tahunAjaranId, mahasiswa] of mahasiswaPerTahun) {
    await hitungUlangCPL([...mahasiswa], tahunAjaranId);
  }

  console.log("Impor selesai. Tidak ada pendaftaran mahasiswa atau nilai yang dibuat.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => Promise.all([prisma.$disconnect(), prismaApp.$disconnect()]));
