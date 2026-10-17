import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berhak" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data CPL");
  worksheet.columns = [
    { header: "Kode CPL", key: "kode", width: 18 },
    { header: "Deskripsi", key: "deskripsi", width: 90 },
  ];
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6BE8" } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Petunjuk impor CPL"],
    ["Isi lembar Data CPL mulai baris 2. Jangan ubah nama atau urutan kolom."],
    ["Kode wajib berformat CPL- diikuti 2-3 digit, contoh CPL-09."],
    ["Deskripsi wajib diisi dan maksimal 500 karakter."],
    ["Kode CPL yang sudah terdaftar akan dilewati dan datanya tidak diubah."],
  ]);
  petunjuk.getRow(1).font = { bold: true, size: 14 };
  petunjuk.getColumn(1).width = 110;

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-cpl.xlsx"',
    },
  });
}
