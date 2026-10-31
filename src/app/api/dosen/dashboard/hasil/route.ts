import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const dosenId = session?.user.dosenId;
  if (!session?.user || !dosenId) {
    return Response.json({ error: "Sesi dosen diperlukan." }, { status: 401 });
  }

  const tahunAjaran = await getTahunAjaranDosen(dosenId);
  if (!tahunAjaran) {
    return Response.json({ error: "Belum ada Tahun Ajaran aktif." }, { status: 404 });
  }

  const mataKuliah = await prisma.mataKuliah.findMany({
    where: {
      OR: [
        { penugasan: { some: { dosenId, tahunAjaranId: tahunAjaran.id } } },
        { kelas: { some: { dosenId, tahunAjaranId: tahunAjaran.id } } },
      ],
    },
    orderBy: { kode: "asc" },
    select: {
      id: true,
      kode: true,
      nama: true,
      penugasan: { where: { dosenId, tahunAjaranId: tahunAjaran.id }, select: { id: true } },
      kelas: { where: { tahunAjaranId: tahunAjaran.id }, select: { id: true, dosenId: true } },
    },
  });
  if (mataKuliah.length === 0) {
    return Response.json({ error: "Belum ada mata kuliah yang ditugaskan kepada Anda." }, { status: 404 });
  }

  const kelasDiampu = new Map(
    mataKuliah.map((item) => [
      item.id,
      {
        koordinator: item.penugasan.length > 0,
        kelas: new Set(item.kelas.filter((kelas) => kelas.dosenId === dosenId).map((kelas) => kelas.id)),
      },
    ]),
  );
  const pendaftaran = await prisma.pendaftaranMK.findMany({
    where: { tahunAjaranId: tahunAjaran.id, mataKuliahId: { in: mataKuliah.map((item) => item.id) } },
    select: { mataKuliahId: true, mahasiswaId: true, kelasId: true },
  });
  const pendaftaranDiampu = pendaftaran.filter((row) => {
    const akses = kelasDiampu.get(row.mataKuliahId);
    return akses?.koordinator || akses?.kelas.has(row.kelasId);
  });
  const mahasiswaIds = [...new Set(pendaftaranDiampu.map((row) => row.mahasiswaId))];
  const mataKuliahDiampu = [...new Set(pendaftaranDiampu.map((row) => row.mataKuliahId))];

  const [hasilCPL, hasilCPMK] = await Promise.all([
    mahasiswaIds.length
      ? prisma.hasilCPL.findMany({
          where: { tahunAjaranId: tahunAjaran.id, mahasiswaId: { in: mahasiswaIds } },
          select: {
            nilai: true,
            statusLengkap: true,
            mahasiswa: { select: { nim: true, nama: true, angkatan: true } },
            cpl: { select: { kode: true, deskripsi: true } },
          },
          orderBy: [{ mahasiswa: { nim: "asc" } }, { cpl: { kode: "asc" } }],
        })
      : [],
    mataKuliahDiampu.length && mahasiswaIds.length
      ? prisma.hasilCPMK.findMany({
          where: {
            tahunAjaranId: tahunAjaran.id,
            mataKuliahId: { in: mataKuliahDiampu },
            mahasiswaId: { in: mahasiswaIds },
          },
          select: {
            mataKuliahId: true,
            mahasiswaId: true,
            nilai: true,
            statusLengkap: true,
            mahasiswa: { select: { nim: true, nama: true, angkatan: true } },
            mataKuliah: { select: { kode: true, nama: true } },
            cpmk: { select: { kode: true, deskripsi: true } },
          },
          orderBy: [{ mahasiswa: { nim: "asc" } }, { mataKuliah: { kode: "asc" } }, { cpmk: { kode: "asc" } }],
        })
      : [],
  ]);
  const pasanganTerdaftar = new Set(pendaftaranDiampu.map((row) => `${row.mataKuliahId}:${row.mahasiswaId}`));
  const hasilCPMKDiampu = hasilCPMK.filter((row) => pasanganTerdaftar.has(`${row.mataKuliahId}:${row.mahasiswaId}`));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Evaluasi CPL";
  workbook.created = new Date();
  const worksheetCPL = workbook.addWorksheet("Hasil CPL");
  worksheetCPL.columns = [
    { header: "NIM", key: "nim", width: 18 },
    { header: "Nama Mahasiswa", key: "nama", width: 30 },
    { header: "Angkatan", key: "angkatan", width: 12 },
    { header: "Kode CPL", key: "kode", width: 16 },
    { header: "Deskripsi CPL", key: "deskripsi", width: 44 },
    { header: "Nilai", key: "nilai", width: 14 },
    { header: "Status", key: "status", width: 18 },
  ];
  for (const item of hasilCPL) {
    worksheetCPL.addRow({
      nim: item.mahasiswa.nim,
      nama: item.mahasiswa.nama,
      angkatan: item.mahasiswa.angkatan,
      kode: item.cpl.kode,
      deskripsi: item.cpl.deskripsi,
      nilai: Number(item.nilai.toFixed(2)),
      status: item.statusLengkap ? "Lengkap" : "Belum lengkap",
    });
  }

  const worksheetCPMK = workbook.addWorksheet("Hasil CPMK");
  worksheetCPMK.columns = [
    { header: "NIM", key: "nim", width: 18 },
    { header: "Nama Mahasiswa", key: "nama", width: 30 },
    { header: "Angkatan", key: "angkatan", width: 12 },
    { header: "Kode MK", key: "kodeMK", width: 14 },
    { header: "Mata Kuliah", key: "mataKuliah", width: 30 },
    { header: "Kode CPMK", key: "kode", width: 16 },
    { header: "Deskripsi CPMK", key: "deskripsi", width: 44 },
    { header: "Nilai", key: "nilai", width: 14 },
    { header: "Status", key: "status", width: 18 },
  ];
  for (const item of hasilCPMKDiampu) {
    worksheetCPMK.addRow({
      nim: item.mahasiswa.nim,
      nama: item.mahasiswa.nama,
      angkatan: item.mahasiswa.angkatan,
      kodeMK: item.mataKuliah.kode,
      mataKuliah: item.mataKuliah.nama,
      kode: item.cpmk.kode,
      deskripsi: item.cpmk.deskripsi,
      nilai: Number(item.nilai.toFixed(2)),
      status: item.statusLengkap ? "Lengkap" : "Belum lengkap",
    });
  }

  for (const sheet of [worksheetCPL, worksheetCPMK]) {
    const header = sheet.getRow(1);
    header.height = 30;
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    header.alignment = { vertical: "middle", wrapText: true };
    sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(sheet.columnCount).letter}1` };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const label = tahunAjaran.label.replace(/[^a-zA-Z0-9-]/g, "-");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hasil-perhitungan-cpl-${label}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
