"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranAktif } from "@/lib/tahun-ajaran";
import { hitungAngkatanDariNim } from "@/lib/nim";
import { hitungUlangCPL, hitungUlangMataKuliah } from "@/lib/perhitungan/hitungUlangMataKuliah";

type Hasil = { error?: string; pesan?: string; nilaiTerhapus?: number };

const POLA_NIM = /^\d{12}$/;
const HALAMAN = "/admin/data-master/mata-kuliah";
const SALAH_TA = "Belum ada Tahun Ajaran aktif. Aktifkan dulu lewat dropdown T.A.";
const MAKS_BARIS_IMPOR_MAHASISWA = 500;

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola pendaftaran mahasiswa.");
  }
}

function bacaIdentitas(formData: FormData) {
  return {
    nim: ((formData.get("nim") as string) ?? "").trim(),
    nama: ((formData.get("nama") as string) ?? "").trim(),
  };
}

function validasiIdentitas(nim: string, nama: string): string | null {
  if (nama.length < 3 || nama.length > 100) return "Nama mahasiswa harus 3-100 karakter.";
  if (!POLA_NIM.test(nim)) return "NIM harus 12 digit angka.";
  return null;
}

function teksSelExcel(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    if ("text" in value) return String(value.text);
    return "";
  }
  return String(value);
}

type BarisImporMahasiswa = {
  baris: number;
  nim: string;
  nama: string;
  kelas: string | null;
  status: "siap" | "terdaftar" | "galat";
  pesan: string[];
};

export async function analisisImporMahasiswa(
  mkId: string,
  formData: FormData,
): Promise<
  | { ok: true; baris: BarisImporMahasiswa[]; baru: number; sudahTerdaftar: number; galat: number }
  | { ok: false; error: string }
> {
  await pastikanAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Format file harus .xlsx." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Ukuran file maksimal 2 MB." };

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, error: "File tidak bisa dibaca. Pastikan file .xlsx valid." };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { ok: false, error: "File tidak memiliki lembar kerja." };

  const header = worksheet.getRow(1);
  const kolom = new Map<string, number>();
  header.eachCell((cell, index) => {
    const namaKolom = teksSelExcel(cell.value).trim().toLowerCase().replace(/\s+/g, " ");
    if (namaKolom === "nim") kolom.set("nim", index);
    if (namaKolom === "nama" || namaKolom === "nama mahasiswa") kolom.set("nama", index);
    if (namaKolom === "kelas") kolom.set("kelas", index);
  });
  if (!kolom.has("nim") || !kolom.has("nama")) {
    return { ok: false, error: "Header Excel harus memiliki kolom NIM dan Nama. Kolom Kelas boleh dikosongkan." };
  }

  const mentah: { baris: number; nim: string; nama: string; kelas: string }[] = [];
  worksheet.eachRow((row, nomor) => {
    if (nomor === 1) return;
    const nim = teksSelExcel(row.getCell(kolom.get("nim")!).value).trim();
    const nama = teksSelExcel(row.getCell(kolom.get("nama")!).value).replace(/\s+/g, " ").trim();
    const kelas = kolom.has("kelas") ? teksSelExcel(row.getCell(kolom.get("kelas")!).value).trim() : "";
    if (!nim && !nama && !kelas) return;
    mentah.push({ baris: nomor, nim, nama, kelas });
  });
  if (mentah.length === 0) return { ok: false, error: "Tidak ada data mahasiswa pada file." };
  if (mentah.length > MAKS_BARIS_IMPOR_MAHASISWA) {
    return { ok: false, error: `Maksimal ${MAKS_BARIS_IMPOR_MAHASISWA} baris mahasiswa per impor.` };
  }

  const ta = await getTahunAjaranAktif();
  if (!ta) return { ok: false, error: SALAH_TA };
  const [mk, kelasAda] = await Promise.all([
    prisma.mataKuliah.findUnique({ where: { id: mkId }, select: { id: true } }),
    prisma.kelasMK.findMany({
      where: { mataKuliahId: mkId, tahunAjaranId: ta.id },
      select: { id: true, nama: true },
    }),
  ]);
  if (!mk) return { ok: false, error: "Mata kuliah tidak ditemukan." };

  const frekuensiNim = new Map<string, number>();
  for (const baris of mentah) {
    if (baris.nim) frekuensiNim.set(baris.nim, (frekuensiNim.get(baris.nim) ?? 0) + 1);
  }
  const kelasPerNama = new Map(kelasAda.map((kelas) => [kelas.nama.toLowerCase(), kelas]));
  const hasil: BarisImporMahasiswa[] = mentah.map((baris) => {
    const pesan: string[] = [];
    if (!/^\d{12}$/.test(baris.nim)) pesan.push("NIM harus 12 digit angka.");
    if (baris.nama.length < 3 || baris.nama.length > 100) pesan.push("Nama harus 3-100 karakter.");
    if ((frekuensiNim.get(baris.nim) ?? 0) > 1) pesan.push("NIM muncul lebih dari sekali di file.");
    const kelas = baris.kelas ? kelasPerNama.get(baris.kelas.toLowerCase()) : undefined;
    if (baris.kelas && !kelas) pesan.push(`Kelas "${baris.kelas}" tidak ada pada MK ini di T.A. aktif.`);
    return {
      ...baris,
      kelas: kelas?.nama ?? null,
      status: pesan.length > 0 ? "galat" : "siap",
      pesan,
    };
  });

  const nims = hasil.filter((baris) => baris.status !== "galat").map((baris) => baris.nim);
  const [mahasiswaAda, pendaftaranAda] = nims.length
    ? await Promise.all([
        prisma.mahasiswa.findMany({ where: { nim: { in: nims } }, select: { nim: true, nama: true } }),
        prisma.pendaftaranMK.findMany({
          where: { mataKuliahId: mkId, tahunAjaranId: ta.id, mahasiswa: { nim: { in: nims } } },
          select: { mahasiswa: { select: { nim: true } } },
        }),
      ])
    : [[], []];
  const mahasiswaPerNim = new Map(mahasiswaAda.map((mahasiswa) => [mahasiswa.nim, mahasiswa]));
  const sudahTerdaftar = new Set(pendaftaranAda.map((pendaftaran) => pendaftaran.mahasiswa.nim));

  for (const baris of hasil) {
    if (baris.status === "galat") continue;
    const mahasiswa = mahasiswaPerNim.get(baris.nim);
    if (mahasiswa && mahasiswa.nama !== baris.nama) {
      baris.pesan.push(`Nama di sistem tetap "${mahasiswa.nama}".`);
    }
    if (sudahTerdaftar.has(baris.nim)) {
      baris.status = "terdaftar";
      baris.pesan.push("Mahasiswa sudah terdaftar di MK ini; tidak akan diubah.");
    }
  }

  return {
    ok: true,
    baris: hasil,
    baru: hasil.filter((baris) => baris.status === "siap").length,
    sudahTerdaftar: hasil.filter((baris) => baris.status === "terdaftar").length,
    galat: hasil.filter((baris) => baris.status === "galat").length,
  };
}

export async function terapkanImporMahasiswa(
  mkId: string,
  barisMentah: { nim: string; nama: string; kelas: string | null }[],
): Promise<Hasil> {
  await pastikanAdmin();
  if (!Array.isArray(barisMentah) || barisMentah.length === 0 || barisMentah.length > MAKS_BARIS_IMPOR_MAHASISWA) {
    return { error: `Data impor tidak valid atau melebihi batas ${MAKS_BARIS_IMPOR_MAHASISWA} baris.` };
  }

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const [mk, kelasAda] = await Promise.all([
    prisma.mataKuliah.findUnique({ where: { id: mkId }, select: { id: true, kode: true } }),
    prisma.kelasMK.findMany({
      where: { mataKuliahId: mkId, tahunAjaranId: ta.id },
      select: { id: true, nama: true },
    }),
  ]);
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  const kelasPerNama = new Map(kelasAda.map((kelas) => [kelas.nama.toLowerCase(), kelas]));
  const nimDilihat = new Set<string>();
  const baris: { nim: string; nama: string; kelasId: string | null }[] = [];
  for (const data of barisMentah) {
    if (
      !data ||
      typeof data.nim !== "string" ||
      typeof data.nama !== "string" ||
      (typeof data.kelas !== "string" && data.kelas !== null)
    ) {
      return { error: "Format data impor tidak valid." };
    }
    const nim = data.nim.trim();
    const nama = data.nama.replace(/\s+/g, " ").trim();
    const kelasNama = data.kelas?.trim() ?? "";
    const salah = validasiIdentitas(nim, nama);
    if (salah) return { error: `Baris dengan NIM ${nim || "(kosong)"} tidak valid: ${salah}` };
    if (nimDilihat.has(nim)) return { error: `NIM ${nim} muncul lebih dari sekali di file.` };
    nimDilihat.add(nim);
    const kelas = kelasNama ? kelasPerNama.get(kelasNama.toLowerCase()) : undefined;
    if (kelasNama && !kelas) return { error: `Kelas "${kelasNama}" tidak ditemukan pada MK ini di T.A. aktif.` };
    baris.push({ nim, nama, kelasId: kelas?.id ?? null });
  }

  const hasil = await prisma.$transaction(async (tx) => {
    let ditambahkan = 0;
    let sudahTerdaftar = 0;
    for (const data of baris) {
      const mahasiswa = await tx.mahasiswa.upsert({
        where: { nim: data.nim },
        update: {},
        create: { nim: data.nim, nama: data.nama, angkatan: hitungAngkatanDariNim(data.nim) },
        select: { id: true },
      });
      const kunci = {
        mahasiswaId_mataKuliahId_tahunAjaranId: {
          mahasiswaId: mahasiswa.id,
          mataKuliahId: mkId,
          tahunAjaranId: ta.id,
        },
      };
      const pendaftaran = await tx.pendaftaranMK.findUnique({ where: kunci, select: { id: true } });
      if (pendaftaran) {
        sudahTerdaftar++;
        continue;
      }
      await tx.pendaftaranMK.create({
        data: { mahasiswaId: mahasiswa.id, mataKuliahId: mkId, tahunAjaranId: ta.id, kelasId: data.kelasId },
      });
      ditambahkan++;
    }
    return { ditambahkan, sudahTerdaftar };
  });

  if (hasil.ditambahkan > 0) await hitungUlangMataKuliah(mkId, ta.id);
  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/input-nilai/${mkId}`);
  return {
    pesan: `Impor ${mk.kode} selesai: ${hasil.ditambahkan} mahasiswa ditambahkan, ${hasil.sudahTerdaftar} sudah terdaftar. Mahasiswa yang tidak ada di Excel tetap terdaftar.`,
  };
}

export async function tambahMahasiswaKeKelas(mkId: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const { nim, nama } = bacaIdentitas(formData);
  const salah = validasiIdentitas(nim, nama);
  if (salah) return { error: salah };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const kelasId = ((formData.get("kelasId") as string) ?? "").trim() || null;
  if (kelasId && !(await prisma.kelasMK.findFirst({ where: { id: kelasId, mataKuliahId: mkId, tahunAjaranId: ta.id } }))) {
    return { error: "Kelas tidak ditemukan untuk mata kuliah ini." };
  }
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };

  let mhs = await prisma.mahasiswa.findUnique({ where: { nim } });
  let catatan = "";
  if (!mhs) {
    mhs = await prisma.mahasiswa.create({ data: { nim, nama, angkatan: hitungAngkatanDariNim(nim) } });
  } else if (mhs.nama !== nama) {
    catatan = ` (NIM sudah terdaftar atas nama ${mhs.nama}, nama tidak diubah)`;
  }

  const sudah = await prisma.pendaftaranMK.findUnique({
    where: {
      mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId: mhs.id, mataKuliahId: mkId, tahunAjaranId: ta.id },
    },
  });
  if (sudah) return { error: `${mhs.nama} sudah terdaftar di kelas ini.` };

  await prisma.pendaftaranMK.create({ data: { mahasiswaId: mhs.id, mataKuliahId: mkId, tahunAjaranId: ta.id, kelasId } });
  await hitungUlangMataKuliah(mkId, ta.id);

  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/input-nilai/${mkId}`);
  return { pesan: `${mhs.nama} ditambahkan ke ${mk.kode}${catatan}` };
}

export async function buatKelasMK(mkId: string, namaMentah: string, dosenIdMentah: string): Promise<Hasil> {
  await pastikanAdmin();
  const nama = namaMentah.trim();
  if (!/^[\p{L}\p{N} ._-]{1,40}$/u.test(nama)) return { error: "Nama kelas wajib diisi (maksimal 40 karakter)." };
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const mk = await prisma.mataKuliah.findUnique({ where: { id: mkId }, select: { id: true } });
  if (!mk) return { error: "Mata kuliah tidak ditemukan." };
  const dosenId = dosenIdMentah.trim() || null;
  if (dosenId && !(await prisma.dosen.findUnique({ where: { id: dosenId }, select: { id: true } }))) {
    return { error: "Dosen pengampu tidak ditemukan." };
  }
  const ada = await prisma.kelasMK.findUnique({
    where: { mataKuliahId_tahunAjaranId_nama: { mataKuliahId: mkId, tahunAjaranId: ta.id, nama } },
    select: { id: true },
  });
  if (ada) return { error: `Kelas ${nama} sudah ada pada mata kuliah ini.` };
  await prisma.kelasMK.create({ data: { mataKuliahId: mkId, tahunAjaranId: ta.id, nama, dosenId } });
  revalidatePath(HALAMAN);
  return { pesan: `Kelas ${nama} berhasil dibuat.` };
}

export async function ubahPengampuKelas(kelasId: string, dosenIdMentah: string): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const kelas = await prisma.kelasMK.findFirst({ where: { id: kelasId, tahunAjaranId: ta.id }, select: { id: true, mataKuliahId: true } });
  if (!kelas) return { error: "Kelas tidak ditemukan pada Tahun Ajaran aktif." };
  const dosenId = dosenIdMentah.trim() || null;
  if (dosenId && !(await prisma.dosen.findUnique({ where: { id: dosenId }, select: { id: true } }))) {
    return { error: "Dosen pengampu tidak ditemukan." };
  }
  await prisma.kelasMK.update({ where: { id: kelasId }, data: { dosenId } });
  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/komponen-penilaian/${kelas.mataKuliahId}`);
  revalidatePath(`/dosen/input-nilai/${kelas.mataKuliahId}`);
  return { pesan: "Pengampu kelas berhasil diperbarui." };
}

export async function pindahMahasiswaAntarKelas(mkId: string, mahasiswaId: string, kelasIdMentah: string): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  const kelasId = kelasIdMentah.trim() || null;
  if (kelasId && !(await prisma.kelasMK.findFirst({ where: { id: kelasId, mataKuliahId: mkId, tahunAjaranId: ta.id } }))) {
    return { error: "Kelas tujuan tidak ditemukan untuk mata kuliah ini." };
  }
  const pendaftaran = await prisma.pendaftaranMK.findUnique({
    where: { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } },
  });
  if (!pendaftaran) return { error: "Mahasiswa tidak terdaftar di mata kuliah ini." };
  if (pendaftaran.kelasId === kelasId) return {};
  await prisma.pendaftaranMK.update({ where: { id: pendaftaran.id }, data: { kelasId } });
  await hitungUlangMataKuliah(mkId, ta.id);
  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/input-nilai/${mkId}`);
  return { pesan: "Kelas mahasiswa berhasil diperbarui." };
}

export async function updateMahasiswa(id: string, formData: FormData): Promise<Hasil> {
  await pastikanAdmin();
  const { nim, nama } = bacaIdentitas(formData);
  const salah = validasiIdentitas(nim, nama);
  if (salah) return { error: salah };

  const bentrok = await prisma.mahasiswa.findUnique({ where: { nim } });
  if (bentrok && bentrok.id !== id) return { error: `NIM ${nim} sudah dipakai ${bentrok.nama}.` };

  await prisma.mahasiswa.update({ where: { id }, data: { nim, nama, angkatan: hitungAngkatanDariNim(nim) } });

  revalidatePath(HALAMAN);
  return { pesan: `Data ${nama} berhasil diperbarui` };
}

export async function cekNilaiMahasiswaDiMK(mkId: string, mahasiswaId: string): Promise<number> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return 0;
  return prisma.nilai.count({ where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } } });
}

export async function hapusDariKelas(mkId: string, mahasiswaId: string): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const pendaftaran = await prisma.pendaftaranMK.findUnique({
    where: { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } },
  });
  if (!pendaftaran) return { error: "Mahasiswa tidak terdaftar di kelas ini." };

  const nilaiTerhapus = await prisma.$transaction(async (tx) => {
    const n = await tx.nilai.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } },
    });
    await tx.hasilSubCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, mataKuliahId: mkId },
    });
    await tx.hasilCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, cpmk: { mataKuliahId: mkId } },
    });
    await tx.pendaftaranMK.delete({ where: { id: pendaftaran.id } });
    return n.count;
  });

    await hitungUlangCPL([mahasiswaId], ta.id);

  revalidatePath(HALAMAN);
  return { nilaiTerhapus };
}

export async function urungkanHapusDariKelas(mkId: string, mahasiswaId: string, kelasId?: string | null): Promise<Hasil> {
  await pastikanAdmin();
  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };
  if (kelasId && !(await prisma.kelasMK.findFirst({ where: { id: kelasId, mataKuliahId: mkId, tahunAjaranId: ta.id } }))) {
    return { error: "Kelas asal tidak ditemukan pada Tahun Ajaran aktif." };
  }

  const kunci = { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } };
  const sudah = await prisma.pendaftaranMK.findUnique({ where: kunci });
  if (!sudah) {
    await prisma.pendaftaranMK.create({ data: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id, kelasId: kelasId ?? null } });
  }

  await hitungUlangMataKuliah(mkId, ta.id);
  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/input-nilai/${mkId}`);
  revalidatePath(`/dosen/hasil/${mkId}`);
  return {};
}

export async function pindahKelas(mkId: string, mahasiswaId: string, mkTujuanId: string): Promise<Hasil> {
  await pastikanAdmin();
  if (mkId === mkTujuanId) return { error: "Pilih mata kuliah tujuan yang berbeda." };

  const ta = await getTahunAjaranAktif();
  if (!ta) return { error: SALAH_TA };

  const [asal, tujuan, sudahDiTujuan] = await Promise.all([
    prisma.pendaftaranMK.findUnique({
      where: { mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkId, tahunAjaranId: ta.id } },
    }),
    prisma.mataKuliah.findUnique({ where: { id: mkTujuanId } }),
    prisma.pendaftaranMK.findUnique({
      where: {
        mahasiswaId_mataKuliahId_tahunAjaranId: { mahasiswaId, mataKuliahId: mkTujuanId, tahunAjaranId: ta.id },
      },
    }),
  ]);
  if (!asal) return { error: "Mahasiswa tidak terdaftar di kelas asal." };
  if (!tujuan) return { error: "Mata kuliah tujuan tidak ditemukan." };
  if (sudahDiTujuan) return { error: `Mahasiswa sudah terdaftar di ${tujuan.kode}.` };

  const nilaiTerhapus = await prisma.$transaction(async (tx) => {
    const n = await tx.nilai.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, tugas: { mataKuliahId: mkId } },
    });
    await tx.hasilSubCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, mataKuliahId: mkId },
    });
    await tx.hasilCPMK.deleteMany({
      where: { mahasiswaId, tahunAjaranId: ta.id, cpmk: { mataKuliahId: mkId } },
    });
    await tx.pendaftaranMK.delete({ where: { id: asal.id } });
    await tx.pendaftaranMK.create({ data: { mahasiswaId, mataKuliahId: mkTujuanId, tahunAjaranId: ta.id } });
    return n.count;
  });

  await hitungUlangMataKuliah(mkId, ta.id);
  await hitungUlangMataKuliah(mkTujuanId, ta.id);

  revalidatePath(HALAMAN);
  revalidatePath(`/dosen/input-nilai/${mkId}`);
  revalidatePath(`/dosen/input-nilai/${mkTujuanId}`);
  return { nilaiTerhapus, pesan: tujuan.kode };
}