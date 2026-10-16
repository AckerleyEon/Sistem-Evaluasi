import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function teks(nilai: string | null | undefined) {
  let s = nilai ?? "";
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // cegah isi sel dibaca Excel sebagai rumus
  return `"${s.replace(/"/g, '""')}"`;
}

// NIP 18 digit melebihi presisi angka Excel, jadi dipaksa sebagai teks.
function teksNip(nip: string) {
  return `"=""${nip.replace(/"/g, "")}"""`;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berhak" }, { status: 403 });
  }

  const daftar = await prisma.dosen.findMany({
    orderBy: { nama: "asc" },
    include: {
      penugasan: {
        where: { tahunAjaran: { status: "AKTIF" } },
        include: { mataKuliah: true },
      },
    },
  });

  const header = ["No", "Nama", "Gelar", "NIP", "Mata Kuliah (T.A. Aktif)"].map(teks).join(",");
  const baris = daftar.map((d, i) =>
    [
      teks(String(i + 1)),
      teks(d.nama),
      teks(d.gelar),
      teksNip(d.nip),
      teks(d.penugasan.map((p) => `${p.mataKuliah.kode} ${p.mataKuliah.nama}`).join("; ")),
    ].join(",")
  );

  const csv = "\uFEFF" + [header, ...baris].join("\r\n"); // BOM supaya Excel membaca UTF-8

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="akun-dosen.csv"',
    },
  });
}