import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { cekAksesMK } from "@/lib/otorisasi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mataKuliahId = url.searchParams.get("mataKuliahId");
  const kelasId = url.searchParams.get("kelasId") || undefined;
  if (!mataKuliahId) return NextResponse.json({ error: "Mata kuliah wajib dipilih." }, { status: 400 });

  const akses = await cekAksesMK(mataKuliahId, kelasId);
  if (!akses) return NextResponse.json({ error: "Tidak berhak mengelola asesmen ini." }, { status: 403 });

  const [mataKuliah, subCpmk] = await Promise.all([
    prisma.mataKuliah.findUnique({ where: { id: mataKuliahId }, select: { kode: true, nama: true } }),
    prisma.subCPMK.findMany({
      where: { mataKuliahId, tahunAjaranId: akses.ta.id, cpmkTerkait: { some: {} } },
      select: {
        kode: true,
        deskripsi: true,
        cpmkTerkait: { select: { cpmk: { select: { kode: true } } } },
      },
      orderBy: { kode: "asc" },
    }),
  ]);
  if (!mataKuliah) return NextResponse.json({ error: "Mata kuliah tidak ditemukan." }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Evaluasi CPL";

  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Template Kelola Asesmen"],
    [`Mata kuliah: ${mataKuliah.kode} - ${mataKuliah.nama}`],
    [`Tahun ajaran: ${akses.ta.label}`],
    [kelasId ? "Template ini menambahkan tugas untuk kelas yang dipilih." : "Template ini menambahkan tugas umum mata kuliah."],
    ["Isi lembar Asesmen mulai baris 2. Satu baris untuk satu tugas baru."],
    ["Isi nama tugas, pertemuan 1-16, bobot dalam persen, dan kode Sub-CPMK dari lembar Referensi."],
    ["Jika satu tugas memetakan beberapa Sub-CPMK, pisahkan kodenya dengan koma. Contoh: SUB-ELKA-1, SUB-ELKA-2."],
    ["Bobot tugas baru harus bilangan bulat 1-99. Jika belum ada tugas sebelumnya, total bobot semua baris harus 100%."],
    ["Jika sudah ada tugas, total bobot yang diimpor harus kurang dari 100%; sisa bobot tugas sebelumnya akan disesuaikan proporsional."],
    ["Impor hanya menambahkan tugas baru. Tugas lama dan nilai mahasiswa tidak dihapus atau diubah."],
    ["Jangan mengubah nama lembar atau judul kolom."],
  ]);
  petunjuk.getColumn(1).width = 115;
  petunjuk.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  petunjuk.getRow(1).font = { bold: true, size: 16, color: { argb: "FF1D4ED8" } };
  petunjuk.getRow(1).height = 28;

  const asesmen = workbook.addWorksheet("Asesmen");
  asesmen.columns = [
    { header: "Nama Tugas", key: "nama", width: 32 },
    { header: "Pertemuan Ke", key: "pertemuan", width: 16 },
    { header: "Bobot (%)", key: "bobot", width: 14 },
    { header: "Kode Sub-CPMK (pisahkan koma)", key: "subCpmk", width: 55 },
  ];
  for (let row = 2; row <= 101; row += 1) {
    asesmen.getCell(row, 2).dataValidation = {
      type: "whole",
      operator: "between",
      formulae: [1, 16],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Pertemuan tidak valid",
      error: "Isi angka 1 sampai 16.",
    };
    asesmen.getCell(row, 3).dataValidation = {
      type: "whole",
      operator: "between",
      formulae: [1, 99],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Bobot tidak valid",
      error: "Isi angka bulat 1 sampai 99.",
    };
  }
  asesmen.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  asesmen.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  asesmen.getRow(1).alignment = { wrapText: true, vertical: "middle" };
  asesmen.getRow(1).height = 32;
  asesmen.views = [{ state: "frozen", ySplit: 1 }];
  asesmen.autoFilter = { from: "A1", to: "D1" };

  const referensi = workbook.addWorksheet("Referensi Sub-CPMK");
  referensi.columns = [
    { header: "Kode Sub-CPMK", key: "kode", width: 30 },
    { header: "Kode CPMK", key: "cpmk", width: 22 },
    { header: "Deskripsi Sub-CPMK", key: "deskripsi", width: 80 },
  ];
  for (const sub of subCpmk) {
    referensi.addRow({
      kode: sub.kode,
      cpmk: sub.cpmkTerkait.map((relasi) => relasi.cpmk.kode).join(", "),
      deskripsi: sub.deskripsi,
    });
  }
  referensi.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  referensi.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  referensi.getRow(1).alignment = { wrapText: true, vertical: "middle" };
  referensi.views = [{ state: "frozen", ySplit: 1 }];
  referensi.autoFilter = { from: "A1", to: "C1" };

  const metadata = workbook.addWorksheet("_metadata");
  metadata.addRow(["mataKuliahId", "tahunAjaranId", "kelasId"]);
  metadata.addRow([mataKuliahId, akses.ta.id, kelasId ?? ""]);
  metadata.state = "hidden";

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `template-asesmen-${mataKuliah.kode.replace(/[^a-zA-Z0-9-]/g, "-")}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
