import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berhak" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data Dosen");
  worksheet.columns = [
    { header: "Nama", key: "nama", width: 32 },
    { header: "Gelar", key: "gelar", width: 24 },
    { header: "NIP", key: "nip", width: 24, style: { numFmt: "@" } },
  ];
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6BE8" } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const petunjuk = workbook.addWorksheet("Petunjuk");
  petunjuk.addRows([
    ["Petunjuk impor akun dosen"],
    ["Isi lembar Data Dosen mulai baris 2. Jangan ubah nama atau urutan kolom."],
    ["Nama wajib diisi (maksimal 120 karakter). Gelar boleh dikosongkan."],
    ["NIP wajib 8-20 digit dan menjadi username login. Format sel NIP sebagai Teks sebelum mengisi."],
    ["Akun dengan NIP yang sudah terdaftar akan dilewati, bukan diperbarui."],
    ["Kata sandi sementara dibuat otomatis dan ditampilkan setelah impor berhasil."],
  ]);
  petunjuk.getRow(1).font = { bold: true, size: 14 };
  petunjuk.getColumn(1).width = 110;

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-dosen.xlsx"',
    },
  });
}
