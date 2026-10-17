import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berhak" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data Mahasiswa");
  worksheet.columns = [
    { header: "NIM", key: "nim", width: 20, style: { numFmt: "@" } },
    { header: "Nama", key: "nama", width: 36 },
    { header: "Kelas", key: "kelas", width: 18 },
  ];
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6BE8" } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Petunjuk impor mahasiswa ke mata kuliah"],
    ["Isi lembar Data Mahasiswa mulai baris 2. Jangan ubah nama atau urutan kolom."],
    ["NIM wajib 12 digit dan disimpan sebagai Teks. Nama wajib diisi."],
    ["Kelas boleh dikosongkan. Jika diisi, gunakan nama kelas yang tersedia pada mata kuliah terpilih."],
    ["Impor hanya menambahkan pendaftaran; mahasiswa yang tidak ada di file tetap terdaftar."],
    ["NIM yang sudah ada di sistem akan memakai data mahasiswa yang sudah tersimpan."],
  ]);
  petunjuk.getRow(1).font = { bold: true, size: 14 };
  petunjuk.getColumn(1).width = 110;

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-mahasiswa.xlsx"',
    },
  });
}
