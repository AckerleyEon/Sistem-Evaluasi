import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { cekAksesMK } from "@/lib/otorisasi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mataKuliahId = url.searchParams.get("mataKuliahId");
  const kelasId = url.searchParams.get("kelasId") || undefined;
  const tugasId = url.searchParams.get("tugasId");
  if (!mataKuliahId || !tugasId) {
    return NextResponse.json({ error: "Mata kuliah dan tugas wajib dipilih." }, { status: 400 });
  }

  const akses = await cekAksesMK(mataKuliahId, kelasId);
  if (!akses) return NextResponse.json({ error: "Tidak berhak mengakses nilai ini." }, { status: 403 });

  const kelasFilter = akses.kelasId
    ? { OR: [{ kelasId: akses.kelasId }, ...(akses.koordinator ? [{ kelasId: null }] : [])] }
    : {};
  const tugas = await prisma.tugas.findFirst({
    where: { id: tugasId, mataKuliahId, tahunAjaranId: akses.ta.id, ...kelasFilter },
    select: {
      id: true,
      nama: true,
      pertemuanKe: true,
      kelasId: true,
      mataKuliah: { select: { kode: true, nama: true } },
    },
  });
  if (!tugas) return NextResponse.json({ error: "Tugas tidak ditemukan untuk mata kuliah/kelas ini." }, { status: 404 });

  const kelasMahasiswaId = akses.kelasId ?? tugas.kelasId;
  const [pendaftaran, kelas] = await Promise.all([
    prisma.pendaftaranMK.findMany({
      where: { mataKuliahId, tahunAjaranId: akses.ta.id, ...(kelasMahasiswaId ? { kelasId: kelasMahasiswaId } : {}) },
      select: {
        mahasiswaId: true,
        mahasiswa: { select: { nim: true, nama: true } },
      },
      orderBy: { mahasiswa: { nim: "asc" } },
    }),
    kelasMahasiswaId
      ? prisma.kelasMK.findUnique({ where: { id: kelasMahasiswaId }, select: { nama: true } })
      : Promise.resolve(null),
  ]);
  const nilai = pendaftaran.length
    ? await prisma.nilai.findMany({
        where: {
          tugasId,
          tahunAjaranId: akses.ta.id,
          mahasiswaId: { in: pendaftaran.map((item) => item.mahasiswaId) },
        },
        select: { mahasiswaId: true, skor: true },
      })
    : [];
  const nilaiPerMahasiswa = new Map(nilai.map((item) => [item.mahasiswaId, item.skor]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Evaluasi CPL";
  const worksheet = workbook.addWorksheet("Nilai");
  worksheet.columns = [
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama Mahasiswa", key: "nama", width: 34 },
    { header: "Nilai", key: "nilai", width: 14 },
  ];
  for (const item of pendaftaran) {
    worksheet.addRow({
      nim: item.mahasiswa.nim,
      nama: item.mahasiswa.nama,
      nilai: nilaiPerMahasiswa.get(item.mahasiswaId) ?? null,
    });
  }
  worksheet.getColumn("nim").numFmt = "@";
  worksheet.getColumn("nilai").numFmt = "0.0";
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: "C1" };
  for (let row = 2; row <= Math.max(worksheet.rowCount, 2); row += 1) {
    worksheet.getCell(row, 3).dataValidation = {
      type: "decimal",
      operator: "between",
      formulae: [0, 100],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Nilai tidak valid",
      error: "Isi nilai angka 0 sampai 100.",
    };
  }

  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Template Import Nilai"],
    [`Mata kuliah: ${tugas.mataKuliah.kode} - ${tugas.mataKuliah.nama}`],
    [`Tahun ajaran: ${akses.ta.label}`],
    [`Tugas: ${tugas.nama} (Pertemuan ${tugas.pertemuanKe})`],
    [`Kelas: ${kelas?.nama ?? "Semua kelas"}`],
    ["Isi kolom Nilai dengan angka 0-100. Nilai boleh menggunakan maksimal satu angka desimal."],
    ["Jangan ubah NIM karena digunakan untuk mencocokkan mahasiswa. Kolom Nama Mahasiswa hanya sebagai referensi."],
    ["Baris dengan nilai kosong akan dilewati. Mahasiswa lain di luar daftar nilai tidak terpengaruh."],
    ["Pilih template yang sudah diisi melalui dialog Import Nilai. Nilai akan dipratinjau sebelum dimasukkan ke formulir."],
    ["Setelah pratinjau diterapkan, tekan Simpan Perubahan untuk menyimpan nilai ke sistem."],
    ["Jangan mengubah nama lembar atau judul kolom."],
  ]);
  petunjuk.getColumn(1).width = 110;
  petunjuk.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  petunjuk.getRow(1).font = { bold: true, size: 15, color: { argb: "FF1D4ED8" } };
  petunjuk.getRow(1).height = 28;

  const metadata = workbook.addWorksheet("_metadata");
  metadata.addRow(["mataKuliahId", "tahunAjaranId", "kelasId", "tugasId"]);
  metadata.addRow([mataKuliahId, akses.ta.id, akses.kelasId ?? "", tugasId]);
  metadata.state = "hidden";

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `template-nilai-${tugas.mataKuliah.kode}-${tugas.nama}`
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
