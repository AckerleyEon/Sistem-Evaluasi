import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { ambilDataLaporanCPL, kategoriMutu } from "@/lib/laporan-cpl";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const dosenId = session?.user?.dosenId;
  if (!session?.user || session.user.role !== "DOSEN" || !dosenId) {
    return Response.json({ error: "Sesi dosen diperlukan." }, { status: 401 });
  }

  const ta = await getTahunAjaranDosen(dosenId);
  const laporan = await ambilDataLaporanCPL(ta?.id);
  if (!laporan) return Response.json({ error: "Belum ada Tahun Ajaran aktif." }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Evaluasi CPL";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Portofolio CPL");
  const komponen = [
    ...laporan.cpl.map((item) => ({ ...item, tingkat: "CPL" })),
    ...laporan.cpmk.map((item) => ({ ...item, tingkat: "CPMK" })),
    ...laporan.subCpmk.map((item) => ({ ...item, tingkat: "Sub-CPMK" })),
  ];
  worksheet.columns = [
    { header: "NIM", key: "nim", width: 18 },
    { header: "Nama Mahasiswa", key: "nama", width: 32 },
    { header: "Angkatan", key: "angkatan", width: 12 },
    { header: "Rata-rata CPL", key: "rataCPL", width: 16 },
    { header: "Kategori Mutu", key: "kategori", width: 16 },
    ...komponen.map((item, index) => ({
      header: `${item.tingkat} ${item.kode} · Nilai`,
      key: `nilai${index}`,
      width: 20,
    })),
    ...komponen.map((item, index) => ({
      header: `${item.tingkat} ${item.kode} · Status`,
      key: `status${index}`,
      width: 20,
    })),
  ];

  for (const mahasiswa of laporan.mahasiswa) {
    const row: Record<string, string | number | null> = {
      nim: mahasiswa.nim,
      nama: mahasiswa.nama,
      angkatan: mahasiswa.angkatan,
      rataCPL: mahasiswa.rataCPL === null ? null : Number(mahasiswa.rataCPL.toFixed(2)),
      kategori: kategoriMutu(mahasiswa.rataCPL) ?? "Belum ada data",
    };
    komponen.forEach((item, index) => {
      const hasil = item.tingkat === "CPL"
        ? mahasiswa.cpl[item.id]
        : item.tingkat === "CPMK"
          ? mahasiswa.cpmk[item.id]
          : mahasiswa.subCpmk[item.id];
      row[`nilai${index}`] = hasil ? Number(hasil.nilai.toFixed(2)) : null;
      row[`status${index}`] = hasil ? (hasil.nilai >= laporan.passingGrade ? "Tuntas" : "Belum Tercapai") : "Belum ada data";
    });
    worksheet.addRow(row);
  }

  const header = worksheet.getRow(1);
  header.height = 32;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  header.alignment = { vertical: "middle", wrapText: true };
  worksheet.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `${worksheet.getColumn(worksheet.columnCount).letter}1` };

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `portofolio-cpl-${laporan.tahunAjaran.label.replace(/[^a-zA-Z0-9-]/g, "-")}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
