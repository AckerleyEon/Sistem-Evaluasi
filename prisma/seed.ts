import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAFTAR_DOSEN = [
  { nama: "Achmad Fiqhi Ibadillah", gelar: "S.T., M.Sc.", nip: "198807162015041005" },
  { nama: "Achmad Ubaidillah Ms.", gelar: "S.T., M.T", nip: "198106262008011010" },
  { nama: "Achmad Zain Nur", gelar: "S.Kom M.T", nip: "199506102024061002" },
  { nama: "Adi Kurniawan Saputro", gelar: "S.Pd., M.T", nip: "199112312019031017" },
  { nama: "Deni Tri Laksono", gelar: "S.Pd., M.T", nip: "199211292019031014" },
  { nama: "Dian Neipa Purnamasari", gelar: "S.ST, M.Tr.T.", nip: "199506122020122026" },
  { nama: "Diana Rahmawati", gelar: "S.T., M.T", nip: "197910252008012020" },
  { nama: "Haryanto", gelar: "S.T., M.T", nip: "197407052008121004" },
  { nama: "Kunto Aji Wibisono", gelar: "S.T., M.T", nip: "198710142015041001" },
  { nama: "Miftachul Ulum", gelar: "S.T., M.T.", nip: "197608122009121001" },
  { nama: "Monika Faswia Fahmi", gelar: "S.Pd., M.T", nip: "199407282022032012" },
  { nama: "Muhhammad Iyan Putra Pratama", gelar: "S.ST, M.Sc.", nip: "199408192025061004" },
  { nama: "Muttaqin Hardiwansyah", gelar: "S.ST., M.T.", nip: "198804072022031003" },
  { nama: "Puteri Nurul Ma'rifah", gelar: "S.Tr.T., M.Tr.T.", nip: "199706242024062001" },
  { nama: "Riza Alfita", gelar: "ST., MT", nip: "198004192008121003" },
  { nama: "Safriudin Rifandi", gelar: "S.T., M.Tr.T.", nip: "198909232025061001" },
];

async function buatUser() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const dosenPassword = await bcrypt.hash("dosen123", 10);

  await prisma.user.create({
    data: {
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
      email: "yongkipratama2004@gmail.com", // ganti ke email tes Anda sendiri kalau perlu
    },
  });

  const dosenPerNip: Record<string, { id: string }> = {};
  for (const d of DAFTAR_DOSEN) {
    const user = await prisma.user.create({
      data: {
        username: d.nip,
        password: dosenPassword,
        role: "DOSEN",
        dosen: { create: { nama: d.nama, gelar: d.gelar, nip: d.nip } },
      },
      include: { dosen: true },
    });
    dosenPerNip[d.nip] = user.dosen!;
  }
  return dosenPerNip;
}

async function buatTahunAjaran() {
  const ta2023 = await prisma.tahunAjaran.create({ data: { label: "2023/2024", status: "ARSIP" } });
  const ta2024 = await prisma.tahunAjaran.create({ data: { label: "2024/2025", status: "AKTIF" } });
  return { ta2023, ta2024 };
}

async function buatCPL() {
  const data = [
    { kode: "CPL-1", deskripsi: "Mampu menerapkan prinsip keteknikan untuk merumuskan dan menyelesaikan masalah rekayasa elektro." },
    { kode: "CPL-2", deskripsi: "Mampu merancang sistem kelistrikan sesuai kebutuhan dengan mempertimbangkan keselamatan dan keberlanjutan." },
    { kode: "CPL-3", deskripsi: "Mampu bekerja dalam tim multidisiplin untuk menyelesaikan proyek rekayasa secara profesional." },
    { kode: "CPL-4", deskripsi: "Mampu berkomunikasi secara efektif, baik lisan maupun tulisan, dalam konteks teknik elektro." },
    { kode: "CPL-5", deskripsi: "Mampu belajar sepanjang hayat untuk mengikuti perkembangan teknologi kelistrikan." },
  ];
  const hasil = [];
  for (const d of data) hasil.push(await prisma.cPL.create({ data: d }));
  return hasil;
}

async function buatMataKuliah() {
  const mk1 = await prisma.mataKuliah.create({ data: { kode: "TE201", nama: "Rangkaian Listrik", sks: 3 } });
  const mk2 = await prisma.mataKuliah.create({ data: { kode: "TE305", nama: "Sistem Kendali", sks: 3 } });
  return { mk1, mk2 };
}

async function buatMahasiswa() {
  const data = [
    { nim: "220431100012", nama: "M. Rozik", angkatan: 2022 },
    { nim: "220431100045", nama: "Nur Hidayah", angkatan: 2022 },
    { nim: "230431100012", nama: "Akbar Hidayat", angkatan: 2023 },
    { nim: "230431100052", nama: "Alvi Sifaudin", angkatan: 2023 },
    { nim: "230431100066", nama: "Ananda Insan Firdaus", angkatan: 2023 },
    { nim: "230431100073", nama: "Yongky Pratama", angkatan: 2023 },
    { nim: "230431100101", nama: "Dzul Azmil Amiq", angkatan: 2023 },
    { nim: "240431100007", nama: "Rafi Maulana", angkatan: 2024 },
  ];
  const hasil: Record<string, { id: string }> = {};
  for (const d of data) {
    hasil[d.nim] = await prisma.mahasiswa.create({ data: d });
  }
  return hasil;
}

async function buatPenugasan(tahunAjaranId: string, mataKuliahId: string, dosenId: string) {
  await prisma.penugasanDosenMK.create({ data: { tahunAjaranId, mataKuliahId, dosenId } });
}

async function buatPenilaianMataKuliah(opts: {
  tahunAjaranId: string;
  mataKuliahId: string;
  cplUntukCpmk1: string;
  cplUntukCpmk2: string;
  mahasiswaDanNilai: { mahasiswaId: string; nilaiTugas1: number | null; nilaiTugas2: number | null }[];
}) {
  const { tahunAjaranId, mataKuliahId, cplUntukCpmk1, cplUntukCpmk2, mahasiswaDanNilai } = opts;

  const [sudahCpmk, sudahSub] = await Promise.all([
    prisma.cPMK.count({ where: { tahunAjaranId } }),
    prisma.subCPMK.count({ where: { tahunAjaranId } }),
  ]);

  const cpmk1 = await prisma.cPMK.create({
    data: {
      kode: `CPMK-${sudahCpmk + 1}`,
      deskripsi: "Mampu menganalisis konsep dasar pada mata kuliah ini secara sistematis.",
      bobot: 60,
      mataKuliahId,
      tahunAjaranId,
      cpl: { create: { cplId: cplUntukCpmk1 } },
    },
  });
  const cpmk2 = await prisma.cPMK.create({
    data: {
      kode: `CPMK-${sudahCpmk + 2}`,
      deskripsi: "Mampu menerapkan konsep lanjutan pada mata kuliah ini dalam studi kasus.",
      bobot: 40,
      mataKuliahId,
      tahunAjaranId,
      cpl: { create: { cplId: cplUntukCpmk2 } },
    },
  });

  // Total bobot kaitan per CPMK = bobot CPMK (60 = 20+20+20, 40 = 10+15+15)
  const bobotSub = [
    [20, 20, 20],
    [10, 15, 15],
  ];
  const subCpmkList = [];
  for (const [i, cpmk] of [cpmk1, cpmk2].entries()) {
    for (let j = 1; j <= 3; j++) {
      const sub = await prisma.subCPMK.create({
        data: {
          kode: `Sub-CPMK-${sudahSub + i * 3 + j}`,
          deskripsi: `Capaian ke-${j} untuk ${cpmk.kode}.`,
          tahunAjaranId,
        },
      });
      await prisma.cpmkSub.create({
        data: { cpmkId: cpmk.id, subCpmkId: sub.id, bobot: bobotSub[i][j - 1] },
      });
      subCpmkList.push(sub);
    }
  }

  const tugas1 = await prisma.tugas.create({
    data: { nama: "Tugas Harian", pertemuanKe: 4, bobot: 0.4, mataKuliahId, tahunAjaranId },
  });
  const tugas2 = await prisma.tugas.create({
    data: { nama: "UTS", pertemuanKe: 8, bobot: 0.6, mataKuliahId, tahunAjaranId },
  });
  const daftarTugas = [tugas1, tugas2];

  await prisma.distribusiSubCPMK.create({
    data: { subCpmkId: subCpmkList[0].id, tugasId: tugas1.id, sumber: "MANUAL" },
  });

  const sisaSubCpmk = subCpmkList.slice(1);
  for (const [idx, sub] of sisaSubCpmk.entries()) {
    const tugasTujuan = daftarTugas[idx % daftarTugas.length];
    await prisma.distribusiSubCPMK.create({
      data: { subCpmkId: sub.id, tugasId: tugasTujuan.id, sumber: "OTOMATIS" },
    });
  }

  for (const m of mahasiswaDanNilai) {
    await prisma.pendaftaranMK.create({
      data: { mahasiswaId: m.mahasiswaId, mataKuliahId, tahunAjaranId },
    });
    if (m.nilaiTugas1 !== null) {
      await prisma.nilai.create({
        data: { mahasiswaId: m.mahasiswaId, tugasId: tugas1.id, tahunAjaranId, skor: m.nilaiTugas1 },
      });
    }
    if (m.nilaiTugas2 !== null) {
      await prisma.nilai.create({
        data: { mahasiswaId: m.mahasiswaId, tugasId: tugas2.id, tahunAjaranId, skor: m.nilaiTugas2 },
      });
    }
  }
}

async function main() {
  const dosen = await buatUser();
  const { ta2023, ta2024 } = await buatTahunAjaran();
  const cplList = await buatCPL();
  const { mk1, mk2 } = await buatMataKuliah();
  const mhs = await buatMahasiswa();

  const fiqhi = dosen["198807162015041005"];
  const diana = dosen["197910252008012020"];
  const haryanto = dosen["197407052008121004"];

  await buatPenugasan(ta2023.id, mk1.id, fiqhi.id);
  await buatPenugasan(ta2023.id, mk2.id, haryanto.id);
  await buatPenugasan(ta2024.id, mk1.id, fiqhi.id);
  await buatPenugasan(ta2024.id, mk2.id, diana.id); // sengaja beda dari 2023/2024

  // T.A. 2023/2024 (arsip) — diikuti angkatan 2022, nilai lengkap
  await buatPenilaianMataKuliah({
    tahunAjaranId: ta2023.id,
    mataKuliahId: mk1.id,
    cplUntukCpmk1: cplList[0].id,
    cplUntukCpmk2: cplList[1].id,
    mahasiswaDanNilai: [
      { mahasiswaId: mhs["220431100012"].id, nilaiTugas1: 78, nilaiTugas2: 82 },
      { mahasiswaId: mhs["220431100045"].id, nilaiTugas1: 65, nilaiTugas2: 70 },
    ],
  });
  await buatPenilaianMataKuliah({
    tahunAjaranId: ta2023.id,
    mataKuliahId: mk2.id,
    cplUntukCpmk1: cplList[1].id,
    cplUntukCpmk2: cplList[2].id,
    mahasiswaDanNilai: [
      { mahasiswaId: mhs["220431100012"].id, nilaiTugas1: 88, nilaiTugas2: 91 },
      { mahasiswaId: mhs["220431100045"].id, nilaiTugas1: 72, nilaiTugas2: 75 },
    ],
  });

  // T.A. 2024/2025 (aktif) — angkatan 2023 + 1 mahasiswa 2024, sebagian nilai sengaja belum lengkap
  await buatPenilaianMataKuliah({
    tahunAjaranId: ta2024.id,
    mataKuliahId: mk1.id,
    cplUntukCpmk1: cplList[0].id,
    cplUntukCpmk2: cplList[3].id,
    mahasiswaDanNilai: [
      { mahasiswaId: mhs["230431100012"].id, nilaiTugas1: null, nilaiTugas2: 47 },
      { mahasiswaId: mhs["230431100052"].id, nilaiTugas1: 34, nilaiTugas2: null },
      { mahasiswaId: mhs["230431100066"].id, nilaiTugas1: 23, nilaiTugas2: null },
      { mahasiswaId: mhs["230431100073"].id, nilaiTugas1: 88, nilaiTugas2: 98 },
      { mahasiswaId: mhs["230431100101"].id, nilaiTugas1: 25, nilaiTugas2: 50 },
      { mahasiswaId: mhs["240431100007"].id, nilaiTugas1: null, nilaiTugas2: null },
    ],
  });
  await buatPenilaianMataKuliah({
    tahunAjaranId: ta2024.id,
    mataKuliahId: mk2.id,
    cplUntukCpmk1: cplList[4].id,
    cplUntukCpmk2: cplList[2].id,
    mahasiswaDanNilai: [
      { mahasiswaId: mhs["230431100012"].id, nilaiTugas1: 55, nilaiTugas2: 60 },
      { mahasiswaId: mhs["230431100052"].id, nilaiTugas1: 70, nilaiTugas2: null },
      { mahasiswaId: mhs["230431100073"].id, nilaiTugas1: 90, nilaiTugas2: 85 },
      { mahasiswaId: mhs["240431100007"].id, nilaiTugas1: 60, nilaiTugas2: 58 },
    ],
  });

  console.log("Seed selesai.");
  console.log("Login admin: admin / admin123");
  console.log("Login dosen: <NIP> / dosen123 (contoh: 198807162015041005)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });