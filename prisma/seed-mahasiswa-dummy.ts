import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hitungUlangMataKuliah } from "../src/lib/perhitungan/hitungUlangMataKuliah";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ANGKATAN = [2022, 2023, 2024, 2025];
const NAMA_DEPAN = [
  "Aditya", "Aisyah", "Ananda", "Bagas", "Citra",
  "Daffa", "Dinda", "Fajar", "Farah", "Hafiz",
  "Intan", "Kevin", "Laila", "Maya", "Nabila",
  "Rafi", "Rania", "Rizky", "Salsa", "Taufik",
];
const NAMA_BELAKANG = [
  "Pratama", "Putri", "Ramadhan", "Sari", "Saputra",
  "Setiawan", "Wibowo", "Lestari", "Kusuma", "Hidayat",
  "Permata", "Maulana", "Anjani", "Firmansyah", "Nugraha",
  "Pertiwi", "Wijaya", "Anggraini", "Fauzi", "Utami",
];

function nimDummy(angkatan: number, nomor: number) {
  const tahun = String(angkatan).slice(-2);
  const nomorUnik = String(nomor + 1).padStart(5, "0");
  return `${tahun}04311${nomorUnik}`;
}

function nimDummyLama(angkatan: number, nomor: number) {
  return `DUMMY${angkatan}${String(nomor + 1).padStart(3, "0")}`;
}

function skorDummy(kunci: string) {
  let hash = 2166136261;
  for (const karakter of kunci) {
    hash = Math.imul(hash ^ karakter.charCodeAt(0), 16777619);
  }
  return 60 + ((hash >>> 0) % 401) / 10;
}

function nilaiKosongDummy(kunci: string) {
  let hash = 2166136261;
  for (const karakter of kunci) {
    hash = Math.imul(hash ^ karakter.charCodeAt(0), 16777619);
  }
  return (hash >>> 0) % 11 === 0;
}

function bobotMerata(jumlah: number) {
  const dasar = Math.floor(100 / jumlah);
  return Array.from({ length: jumlah }, (_, indeks) => dasar + (indeks < 100 % jumlah ? 1 : 0));
}

function bobotProporsional(bobot: number[]) {
  const total = bobot.reduce((jumlah, nilai) => jumlah + nilai, 0);
  const acuan = total > 0 ? bobot : bobot.map(() => 1);
  const nilaiTepat = acuan.map((nilai) => (nilai / acuan.reduce((jumlah, item) => jumlah + item, 0)) * 100);
  const hasil = nilaiTepat.map(Math.floor);
  const sisa = 100 - hasil.reduce((jumlah, nilai) => jumlah + nilai, 0);
  const urutan = nilaiTepat
    .map((nilai, indeks) => ({ indeks, pecahan: nilai - Math.floor(nilai) }))
    .sort((a, b) => b.pecahan - a.pecahan);
  for (let indeks = 0; indeks < sisa; indeks += 1) hasil[urutan[indeks].indeks] += 1;
  return hasil;
}

function slug(teks: string) {
  return teks.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function siapkanCapaianDummy(
  tahunAjaran: { id: string; label: string }[],
  mataKuliah: { id: string; kode: string; nama: string }[],
) {
  const pasangan = tahunAjaran.flatMap((ta) => mataKuliah.map((mk) => ({ ta, mk })));
  const cpmkAwal = await Promise.all(
    pasangan.map(async ({ ta, mk }) => ({
      taId: ta.id,
      mkId: mk.id,
      cpmk: await prisma.cPMK.findMany({
        where: { mataKuliahId: mk.id, tahunAjaranId: ta.id },
        select: { id: true, kode: true, sub: { select: { id: true } } },
        orderBy: { kode: "asc" },
      }),
    })),
  );
  for (const item of cpmkAwal) {
    if (item.cpmk.length > 5) {
      throw new Error(
        `Seeder dihentikan tanpa mengubah data: mata kuliah ${item.mkId}, T.A. ${item.taId} sudah memiliki ${item.cpmk.length} CPMK (maksimum data dummy 5).`,
      );
    }
    const terlaluBanyak = item.cpmk.find((cpmk) => cpmk.sub.length > 9);
    if (terlaluBanyak) {
      throw new Error(
        `Seeder dihentikan tanpa mengubah data: ${terlaluBanyak.kode} sudah memiliki lebih dari 9 Sub-CPMK.`,
      );
    }
  }

  const cplMaster = [
    { kode: "CPL-1", deskripsi: "Mampu menerapkan matematika, sains, dan prinsip rekayasa pada bidang teknik elektro." },
    { kode: "CPL-2", deskripsi: "Mampu merancang komponen, sistem, atau proses teknik elektro sesuai kebutuhan." },
    { kode: "CPL-3", deskripsi: "Mampu melakukan pengujian, pengukuran, dan menganalisis data eksperimen." },
    { kode: "CPL-4", deskripsi: "Mampu mengidentifikasi, merumuskan, dan menyelesaikan masalah teknik elektro." },
    { kode: "CPL-5", deskripsi: "Mampu bekerja sama dan berkomunikasi secara efektif dalam tim multidisiplin." },
    { kode: "CPL-6", deskripsi: "Mampu menerapkan etika profesi, keselamatan, dan pembelajaran sepanjang hayat." },
  ];
  for (const cpl of cplMaster) {
    await prisma.cPL.upsert({
      where: { kode: cpl.kode },
      update: {},
      create: cpl,
    });
  }
  const cplTersedia = await prisma.cPL.findMany({
    where: { kode: { in: cplMaster.map((item) => item.kode) } },
    select: { id: true, kode: true },
    orderBy: { kode: "asc" },
  });
  if (cplTersedia.length !== cplMaster.length) {
    throw new Error("Enam CPL standar tidak berhasil disiapkan.");
  }

  let totalCpmkBaru = 0;
  let totalSubBaru = 0;
  let totalTugasBaru = 0;
  let totalRelasi = 0;

  for (const { ta, mk } of pasangan) {
    const cpmk = await prisma.cPMK.findMany({
      where: { mataKuliahId: mk.id, tahunAjaranId: ta.id },
      select: { id: true, kode: true, bobot: true, sub: { select: { subCpmkId: true, bobot: true } } },
      orderBy: { kode: "asc" },
    });

    for (const item of cpmk) {
      const nomorDummy = item.kode.match(/^CPMK-DUMMY-(\d+)$/i)?.[1];
      if (nomorDummy) {
        const kode = `CPMK-${slug(mk.kode)}-${nomorDummy}`;
        await prisma.cPMK.update({ where: { id: item.id }, data: { kode } });
        item.kode = kode;
      }
    }

    while (cpmk.length < 4) {
      let nomor = cpmk.length + 1;
      let kode = `CPMK-${slug(mk.kode)}-${nomor}`;
      while (cpmk.some((item) => item.kode === kode)) {
        nomor += 1;
        kode = `CPMK-${slug(mk.kode)}-${nomor}`;
      }
      const baru = await prisma.cPMK.create({
        data: {
          kode,
          deskripsi: `Menganalisis dan menerapkan prinsip ${mk.nama} pada studi kasus teknik elektro ${nomor}.`,
          bobot: 0,
          mataKuliahId: mk.id,
          tahunAjaranId: ta.id,
        },
        select: { id: true, kode: true, bobot: true },
      });
      cpmk.push({ ...baru, sub: [] });
      totalCpmkBaru += 1;
    }

    const bobotCpmk = bobotMerata(cpmk.length);
    for (const [indeks, item] of cpmk.entries()) {
      await prisma.cPMK.update({ where: { id: item.id }, data: { bobot: bobotCpmk[indeks] } });
      const cplAwal = (indeks * 2) % cplTersedia.length;
      await prisma.cpmkCpl.createMany({
        data: [
          { cpmkId: item.id, cplId: cplTersedia[cplAwal].id },
          { cpmkId: item.id, cplId: cplTersedia[(cplAwal + 1) % cplTersedia.length].id },
        ],
        skipDuplicates: true,
      });

      const relasiLama = await prisma.cpmkSub.findMany({
        where: { cpmkId: item.id },
        select: { id: true, subCpmkId: true, bobot: true },
      });
      const targetRelasi = Math.max(5, relasiLama.length);
      for (let subNomor = relasiLama.length + 1; subNomor <= targetRelasi; subNomor += 1) {
        const kodeSub = `SUB-${slug(mk.kode)}-${slug(item.kode).replace(/^CPMK-/, "")}-SUB-${String(subNomor).padStart(2, "0")}`;
        const sub = await prisma.subCPMK.upsert({
          where: {
            kode_mataKuliahId_tahunAjaranId: {
              kode: kodeSub,
              mataKuliahId: mk.id,
              tahunAjaranId: ta.id,
            },
          },
          update: {},
          create: {
            kode: kodeSub,
            deskripsi: `Mampu menjelaskan, menganalisis, dan menerapkan indikator ${subNomor} pada ${mk.nama}.`,
            mataKuliahId: mk.id,
            tahunAjaranId: ta.id,
          },
          select: { id: true },
        });
        const tautan = await prisma.cpmkSub.upsert({
          where: { cpmkId_subCpmkId: { cpmkId: item.id, subCpmkId: sub.id } },
          update: {},
          create: { cpmkId: item.id, subCpmkId: sub.id, bobot: 0 },
          select: { id: true, subCpmkId: true, bobot: true },
        });
        if (!relasiLama.some((relasi) => relasi.subCpmkId === tautan.subCpmkId)) totalSubBaru += 1;
        relasiLama.push(tautan);
      }

      const bobotSub = bobotMerata(relasiLama.length);
      for (const [subIndex, relasi] of relasiLama.entries()) {
        await prisma.cpmkSub.update({ where: { id: relasi.id }, data: { bobot: bobotSub[subIndex] } });
      }
    }

    const subCPMKDummy = await prisma.subCPMK.findMany({
      where: {
        mataKuliahId: mk.id,
        tahunAjaranId: ta.id,
        kode: { contains: "DUMMY-" },
      },
      select: { id: true, kode: true },
    });
    for (const item of subCPMKDummy) {
      const kode = item.kode
        .replace(/^DUMMY-/i, "SUB-")
        .replace(/CPMK-DUMMY-/gi, "CPMK-");
      await prisma.subCPMK.update({ where: { id: item.id }, data: { kode } });
    }

    const tugas = await prisma.tugas.findMany({
      where: { mataKuliahId: mk.id, tahunAjaranId: ta.id, kelasId: null },
      select: { id: true, nama: true, pertemuanKe: true, bobot: true },
      orderBy: [{ pertemuanKe: "asc" }, { nama: "asc" }],
    });
    for (const item of tugas) {
      const nama = item.nama.replace(/^Tugas (?:Dummy|Unik)\b/i, "Tugas");
      if (nama !== item.nama) {
        await prisma.tugas.update({ where: { id: item.id }, data: { nama } });
      }
    }
    while (tugas.length < 7) {
      let nomor = 1;
      let nama = `Tugas ${nomor}`;
      while (tugas.some((item) => item.nama === nama)) {
        nomor += 1;
        nama = `Tugas ${nomor}`;
      }
      const baru = await prisma.tugas.create({
        data: {
          nama,
          pertemuanKe: Math.min(16, Math.max(1, nomor * 2)),
          bobot: 0,
          mataKuliahId: mk.id,
          tahunAjaranId: ta.id,
        },
        select: { id: true, nama: true, pertemuanKe: true, bobot: true },
      });
      tugas.push(baru);
      totalTugasBaru += 1;
    }

    const bobotTugas = bobotProporsional(tugas.map((item) => item.bobot));
    for (const [indeks, item] of tugas.entries()) {
      await prisma.tugas.update({ where: { id: item.id }, data: { bobot: bobotTugas[indeks] / 100 } });
    }

    const subSemua = await prisma.subCPMK.findMany({
      where: { mataKuliahId: mk.id, tahunAjaranId: ta.id },
      select: { id: true },
      orderBy: { kode: "asc" },
    });
    const semuaTugas = await prisma.tugas.findMany({
      where: { mataKuliahId: mk.id, tahunAjaranId: ta.id },
      select: { id: true, kelasId: true },
    });
    const kelompokTugas = new Map<string, typeof semuaTugas>();
    for (const item of semuaTugas) {
      const kunci = item.kelasId ?? "GLOBAL";
      kelompokTugas.set(kunci, [...(kelompokTugas.get(kunci) ?? []), item]);
    }
    for (const daftarTugas of kelompokTugas.values()) {
      if (daftarTugas.length === 0) continue;
      const relasiAda = await prisma.distribusiSubCPMK.findMany({
        where: { tugasId: { in: daftarTugas.map((item) => item.id) } },
        select: { tugasId: true, subCpmkId: true },
      });
      const relasiKunci = new Set(relasiAda.map((item) => `${item.tugasId}|${item.subCpmkId}`));
      const distribusi = subSemua.flatMap((sub, indeks) => {
        const target = daftarTugas[indeks % daftarTugas.length];
        const kunci = `${target.id}|${sub.id}`;
        if (relasiKunci.has(kunci)) return [];
        relasiKunci.add(kunci);
        return [{ tugasId: target.id, subCpmkId: sub.id, sumber: "MANUAL" as const }];
      });
      if (distribusi.length > 0) {
        const dibuat = await prisma.distribusiSubCPMK.createMany({ data: distribusi, skipDuplicates: true });
        totalRelasi += dibuat.count;
      }
    }
  }

  console.log(`CPL tersedia: ${cplTersedia.length}.`);
  console.log(`CPMK baru: ${totalCpmkBaru}; Sub-CPMK baru: ${totalSubBaru}; tugas global baru: ${totalTugasBaru}.`);
  console.log(`Relasi tugas–Sub-CPMK baru: ${totalRelasi}.`);
}

async function main() {
  const [tahunAjaran, mataKuliah] = await Promise.all([
    prisma.tahunAjaran.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.mataKuliah.findMany({ select: { id: true, kode: true, nama: true }, orderBy: { kode: "asc" } }),
  ]);

  if (tahunAjaran.length === 0) throw new Error("Belum ada tahun ajaran untuk diisi.");
  if (mataKuliah.length === 0) throw new Error("Belum ada mata kuliah untuk diisi.");
  await siapkanCapaianDummy(tahunAjaran, mataKuliah);

  const roster = ANGKATAN.flatMap((angkatan, indeksAngkatan) =>
    NAMA_DEPAN.map((namaDepan, nomor) => ({
      nim: nimDummy(angkatan, indeksAngkatan * NAMA_DEPAN.length + nomor),
      nimLama: nimDummyLama(angkatan, nomor),
      nama: `${namaDepan} ${NAMA_BELAKANG[nomor]}`,
      angkatan,
    })),
  );
  if (
    roster.some((mahasiswa) => !/^\d{12}$/.test(mahasiswa.nim)) ||
    new Set(roster.map((mahasiswa) => mahasiswa.nim.slice(-5))).size !== roster.length
  ) {
    throw new Error("Format NIM dummy harus 12 digit dengan nomor urut unik.");
  }
  const nimBaru = roster.map((mahasiswa) => mahasiswa.nim);
  const dataTerkait = await prisma.mahasiswa.findMany({
    where: { nim: { in: roster.flatMap((mahasiswa) => [mahasiswa.nim, mahasiswa.nimLama]) } },
    select: { id: true, nim: true, nama: true, angkatan: true },
  });
  const berdasarkanNim = new Map(dataTerkait.map((mahasiswa) => [mahasiswa.nim, mahasiswa]));
  const pembaruan: { id: string; nim: string }[] = [];
  const pembuatan: { nim: string; nama: string; angkatan: number }[] = [];

  for (const mahasiswa of roster) {
    const lama = berdasarkanNim.get(mahasiswa.nimLama);
    const tujuan = berdasarkanNim.get(mahasiswa.nim);
    if (lama && tujuan && lama.id !== tujuan.id) {
      throw new Error(`NIM ${mahasiswa.nim} sudah dipakai mahasiswa lain; data tidak diubah.`);
    }
    if (tujuan && (tujuan.nama !== mahasiswa.nama || tujuan.angkatan !== mahasiswa.angkatan)) {
      throw new Error(`NIM ${mahasiswa.nim} sudah dipakai mahasiswa lain; data tidak diubah.`);
    }
    if (lama) pembaruan.push({ id: lama.id, nim: mahasiswa.nim });
    else if (!tujuan) pembuatan.push({ nim: mahasiswa.nim, nama: mahasiswa.nama, angkatan: mahasiswa.angkatan });
  }

  await prisma.$transaction(async (tx) => {
    for (const mahasiswa of pembaruan) {
      await tx.mahasiswa.update({ where: { id: mahasiswa.id }, data: { nim: mahasiswa.nim } });
    }
    if (pembuatan.length > 0) {
      await tx.mahasiswa.createMany({ data: pembuatan });
    }
  });

  const mahasiswa = await prisma.mahasiswa.findMany({
    where: { nim: { in: nimBaru } },
    select: { id: true, nim: true, angkatan: true },
    orderBy: [{ angkatan: "asc" }, { nim: "asc" }],
  });
  if (mahasiswa.length !== roster.length) {
    throw new Error(`Jumlah mahasiswa dummy tidak sesuai: diharapkan ${roster.length}, ditemukan ${mahasiswa.length}.`);
  }
  const [kelas, tugas] = await Promise.all([
    prisma.kelasMK.findMany({
      where: { tahunAjaranId: { in: tahunAjaran.map((ta) => ta.id) } },
      select: { id: true, mataKuliahId: true, tahunAjaranId: true },
    }),
    prisma.tugas.findMany({
      where: { tahunAjaranId: { in: tahunAjaran.map((ta) => ta.id) } },
      select: { id: true, nama: true, mataKuliahId: true, tahunAjaranId: true, kelasId: true },
    }),
  ]);

  const kelasPerKombinasi = new Map<string, typeof kelas>();
  for (const item of kelas) {
    const kunci = `${item.tahunAjaranId}|${item.mataKuliahId}`;
    kelasPerKombinasi.set(kunci, [...(kelasPerKombinasi.get(kunci) ?? []), item]);
  }
  const tugasPerKombinasi = new Map<string, typeof tugas>();
  for (const item of tugas) {
    const kunci = `${item.tahunAjaranId}|${item.mataKuliahId}`;
    tugasPerKombinasi.set(kunci, [...(tugasPerKombinasi.get(kunci) ?? []), item]);
  }

  let totalPendaftaran = 0;
  let totalNilaiKandidat = 0;
  let totalNilai = 0;
  let totalHitungUlang = 0;
  let totalNilaiKosong = 0;

  for (const ta of tahunAjaran) {
    for (const mk of mataKuliah) {
      const kunci = `${ta.id}|${mk.id}`;
      const daftarKelas = kelasPerKombinasi.get(kunci) ?? [];
      const daftarTugas = tugasPerKombinasi.get(kunci) ?? [];
      const kelasMahasiswa = new Map<string, string | null>();

      const pendaftaran = mahasiswa.map((mhs, indeks) => {
        const kelasId = daftarKelas.length ? daftarKelas[indeks % daftarKelas.length].id : null;
        kelasMahasiswa.set(mhs.id, kelasId);
        return {
          mahasiswaId: mhs.id,
          mataKuliahId: mk.id,
          tahunAjaranId: ta.id,
          kelasId,
        };
      });
      const pendaftaranBaru = await prisma.pendaftaranMK.createMany({
        data: pendaftaran,
        skipDuplicates: true,
      });
      totalPendaftaran += pendaftaranBaru.count;

      const pendaftaranAktif = await prisma.pendaftaranMK.findMany({
        where: { mataKuliahId: mk.id, tahunAjaranId: ta.id, mahasiswaId: { in: mahasiswa.map((mhs) => mhs.id) } },
        select: { mahasiswaId: true, kelasId: true },
      });
      for (const item of pendaftaranAktif) kelasMahasiswa.set(item.mahasiswaId, item.kelasId);

      const nilaiKandidat = mahasiswa.flatMap((mhs) =>
        daftarTugas
          .filter((item) => item.kelasId === null || item.kelasId === kelasMahasiswa.get(mhs.id))
          .map((item) => ({
            mahasiswaId: mhs.id,
            nim: mhs.nim,
            tugasId: item.id,
            tahunAjaranId: ta.id,
            skor: Math.round(skorDummy(`${mhs.nim}|${ta.id}|${mk.id}|${item.id}`) * 10) / 10,
            kosong: nilaiKosongDummy(`${mhs.nim}|${ta.id}|${mk.id}|${item.id}`),
          })),
      );
      totalNilaiKandidat += nilaiKandidat.length;
      const nilai = nilaiKandidat.filter((item) => !item.kosong);
      const nilaiKosong = nilaiKandidat.filter((item) => item.kosong);
      for (const tugasDummy of daftarTugas) {
        const mahasiswaTanpaNilai = nilaiKosong
          .filter((item) => item.tugasId === tugasDummy.id)
          .map((item) => item.mahasiswaId);
        if (mahasiswaTanpaNilai.length > 0) {
          await prisma.nilai.deleteMany({
            where: { tugasId: tugasDummy.id, mahasiswaId: { in: mahasiswaTanpaNilai }, tahunAjaranId: ta.id },
          });
        }
      }
      totalNilaiKosong += nilaiKosong.length;
      const nilaiBaru = await prisma.nilai.createMany({
        data: nilai.map(({ mahasiswaId, tugasId, tahunAjaranId, skor }) => ({ mahasiswaId, tugasId, tahunAjaranId, skor })),
        skipDuplicates: true,
      });
      totalNilai += nilaiBaru.count;

      await hitungUlangMataKuliah(mk.id, ta.id);
      totalHitungUlang += 1;
    }
  }

  console.log(`Mahasiswa dummy tersedia: ${mahasiswa.length} (angkatan ${ANGKATAN.join(", ")}).`);
  console.log(`Contoh NIM: ${mahasiswa[0].nim}, ${mahasiswa[NAMA_DEPAN.length].nim}.`);
  console.log(`Kombinasi mata kuliah/T.A. diproses: ${mataKuliah.length * tahunAjaran.length}.`);
  console.log(`Tugas tersedia: ${tugas.length}; kandidat nilai: ${totalNilaiKandidat}; sengaja kosong: ${totalNilaiKosong}.`);
  console.log(`Pendaftaran baru: ${totalPendaftaran}; nilai baru: ${totalNilai}.`);
  console.log(`Perhitungan CPL diperbarui untuk ${totalHitungUlang} kombinasi.`);
}

main()
  .catch((error: unknown) => {
    console.error("Gagal membuat data dummy mahasiswa:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
