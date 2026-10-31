import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cekAksesMK } from "@/lib/otorisasi";
import { buatNamaFileNilai, KOLOM_NILAI_MASSAL, namaSheetNilai } from "@/lib/nilai-impor-util";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mataKuliahId = new URL(request.url).searchParams.get("mataKuliahId");
  if (!mataKuliahId) {
    return NextResponse.json({ error: "Mata kuliah wajib dipilih." }, { status: 400 });
  }

  const [session, akses] = await Promise.all([auth(), cekAksesMK(mataKuliahId)]);
  if (!session?.user || !akses || akses.ta.status !== "AKTIF") {
    return NextResponse.json({ error: "Tidak berhak mengakses template nilai ini." }, { status: 403 });
  }

  const [mataKuliah, kelas] = await Promise.all([
    prisma.mataKuliah.findUnique({
      where: { id: mataKuliahId },
      select: { id: true, kode: true, nama: true },
    }),
    prisma.kelasMK.findMany({
      where: {
        mataKuliahId,
        tahunAjaranId: akses.ta.id,
        ...(session.user.role === "DOSEN" && !akses.koordinator
          ? { dosenId: session.user.dosenId ?? "" }
          : {}),
      },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
  ]);
  if (!mataKuliah) return NextResponse.json({ error: "Mata kuliah tidak ditemukan." }, { status: 404 });
  if (!kelas.length) return NextResponse.json({ error: "Tidak ada kelas yang dapat dikelola." }, { status: 404 });

  const kelasPerId = new Map(kelas.map((item) => [item.id, item]));
  const tugas = await prisma.tugas.findMany({
    where: {
      mataKuliahId,
      tahunAjaranId: akses.ta.id,
      kelasId: { in: kelas.map((item) => item.id) },
    },
    select: { id: true, nama: true, pertemuanKe: true, kelasId: true },
    orderBy: [{ kelasId: "asc" }, { pertemuanKe: "asc" }, { nama: "asc" }],
  });
  if (!tugas.length) {
    return NextResponse.json({ error: "Belum ada tugas pada kelas yang dapat dikelola." }, { status: 404 });
  }

  const [pendaftaran, nilai] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: {
        mataKuliahId,
        tahunAjaranId: akses.ta.id,
        kelasId: { in: kelas.map((item) => item.id) },
      },
      select: {
        mahasiswaId: true,
        kelasId: true,
        mahasiswa: { select: { nim: true, nama: true } },
      },
      orderBy: [{ kelasId: "asc" }, { mahasiswa: { nim: "asc" } }],
    }),
    prisma.nilai.findMany({
      where: {
        tahunAjaranId: akses.ta.id,
        tugasId: { in: tugas.map((item) => item.id) },
      },
      select: { tugasId: true, mahasiswaId: true, skor: true },
    }),
  ]);
  const mahasiswaPerKelas = new Map<string, typeof pendaftaran>();
  for (const item of pendaftaran) {
    const daftar = mahasiswaPerKelas.get(item.kelasId) ?? [];
    daftar.push(item);
    mahasiswaPerKelas.set(item.kelasId, daftar);
  }
  const nilaiPerTugasMahasiswa = new Map(
    nilai.map((item) => [`${item.tugasId}:${item.mahasiswaId}`, item.skor]),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Evaluasi CPL";
  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Template Import Nilai per Mata Kuliah"],
    [`Mata kuliah: ${mataKuliah.kode} - ${mataKuliah.nama}`],
    [`Tahun ajaran: ${akses.ta.label}`],
    ["Workbook ini berisi satu sheet untuk setiap tugas pada kelas yang dapat Anda kelola."],
    ["Isi kolom Nilai dengan angka 0-100; maksimal satu angka desimal."],
    ["Kolom Kelas dan NIM digunakan untuk memeriksa kelas dan mencocokkan mahasiswa. Jangan mengubahnya."],
    ["Baris dengan nilai kosong dilewati; nilai tersimpan sebelumnya tidak dihapus."],
    ["Unggah workbook untuk mata kuliah ini bersama workbook mata kuliah lain dalam satu kali impor."],
    ["Nilai akan dipratinjau dan tersimpan setelah Anda menekan Simpan Nilai Valid."],
  ]);
  petunjuk.getColumn(1).width = 110;
  petunjuk.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  petunjuk.getRow(1).font = { bold: true, size: 15, color: { argb: "FF1D4ED8" } };
  petunjuk.getRow(1).height = 28;

  const metadataSheet = workbook.addWorksheet("_metadata");
  metadataSheet.addRow(["mataKuliahId", "tahunAjaranId"]);
  metadataSheet.addRow([mataKuliahId, akses.ta.id]);
  metadataSheet.addRow([]);
  metadataSheet.addRow(["sheet", "tugasId", "kelasId"]);

  const metadataTugas: { sheet: string; tugasId: string; kelasId: string }[] = [];
  tugas.forEach((item, index) => {
    const kelasItem = kelasPerId.get(item.kelasId);
    if (!kelasItem) return;
    const sheetName = namaSheetNilai(index, kelasItem.nama, item.nama);
    metadataTugas.push({ sheet: sheetName, tugasId: item.id, kelasId: item.kelasId });

    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: KOLOM_NILAI_MASSAL[0], key: "kelas", width: 20 },
      { header: KOLOM_NILAI_MASSAL[1], key: "nim", width: 20 },
      { header: KOLOM_NILAI_MASSAL[2], key: "nama", width: 34 },
      { header: KOLOM_NILAI_MASSAL[3], key: "nilai", width: 14 },
    ];
    for (const pendaftaranItem of mahasiswaPerKelas.get(item.kelasId) ?? []) {
      sheet.addRow({
        kelas: kelasItem.nama,
        nim: pendaftaranItem.mahasiswa.nim,
        nama: pendaftaranItem.mahasiswa.nama,
        nilai: nilaiPerTugasMahasiswa.get(`${item.id}:${pendaftaranItem.mahasiswaId}`) ?? null,
      });
    }
    sheet.getColumn("nim").numFmt = "@";
    sheet.getColumn("nilai").numFmt = "0.0";
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    sheet.getRow(1).alignment = { vertical: "middle" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "D1" };
    for (let row = 2; row <= Math.max(sheet.rowCount, 2); row += 1) {
      sheet.getCell(row, 4).dataValidation = {
        type: "decimal",
        operator: "between",
        formulae: [0, 100],
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: "Nilai tidak valid",
        error: "Isi nilai angka 0 sampai 100.",
      };
    }
  });
  metadataTugas.forEach((item) => metadataSheet.addRow([item.sheet, item.tugasId, item.kelasId]));
  metadataSheet.state = "hidden";

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = buatNamaFileNilai(mataKuliah.kode, mataKuliah.nama);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
