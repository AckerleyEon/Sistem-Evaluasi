"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengelola Tahun Ajaran.");
  }
}

function validasiLabel(label: string): string | null {
  const match = label.match(/^(\d{4})\/(\d{4})$/);
  if (!match) return 'Format harus "2024/2025" (tahun awal/tahun akhir).';
  const [, awal, akhir] = match;
  if (parseInt(akhir, 10) !== parseInt(awal, 10) + 1) {
    return `Tahun akhir harus ${parseInt(awal, 10) + 1} (satu tahun setelah ${awal}).`;
  }
  return null;
}

export async function createTahunAjaran(formData: FormData) {
  await pastikanAdmin();

  const label = ((formData.get("label") as string) ?? "").trim();
  const mode = (formData.get("mode") as string) === "salin" ? "salin" : "kosong";
  const sumberId = ((formData.get("sumberId") as string) || null) as string | null;

  const errorFormat = validasiLabel(label);
  if (errorFormat) return { error: errorFormat };

  const sudahAda = await prisma.tahunAjaran.findUnique({ where: { label } });
  if (sudahAda) return { error: `Tahun Ajaran ${label} sudah ada.` };

  if (mode === "salin") {
    if (!sumberId) return { error: "Pilih Tahun Ajaran sumber yang akan disalin." };
    const sumber = await prisma.tahunAjaran.findUnique({ where: { id: sumberId } });
    if (!sumber) return { error: "Tahun Ajaran sumber tidak ditemukan." };
  }

  await prisma.$transaction(
    async (tx) => {
      const baru = await tx.tahunAjaran.create({ data: { label, status: "ARSIP" } });
      if (mode !== "salin" || !sumberId) return;

      // 1. Penugasan dosen
      const penugasan = await tx.penugasanDosenMK.findMany({ where: { tahunAjaranId: sumberId } });
      if (penugasan.length > 0) {
        await tx.penugasanDosenMK.createMany({
          data: penugasan.map((p) => ({
            mataKuliahId: p.mataKuliahId,
            dosenId: p.dosenId,
            tahunAjaranId: baru.id,
          })),
        });
      }

      // 2. CPMK (milik mata kuliahnya masing-masing, bobot ikut tersalin)
      const petaCpmk = new Map<string, string>();
      const cpmkLama = await tx.cPMK.findMany({ where: { tahunAjaranId: sumberId } });
      if (cpmkLama.length > 0) {
        await tx.cPMK.createMany({
          data: cpmkLama.map((c) => ({
            kode: c.kode,
            deskripsi: c.deskripsi,
            bobot: c.bobot,
            mataKuliahId: c.mataKuliahId,
            tahunAjaranId: baru.id,
          })),
        });
      }
      const cpmkBaru = await tx.cPMK.findMany({
        where: { tahunAjaranId: baru.id },
        select: { id: true, kode: true, mataKuliahId: true },
      });
      const idCpmkBaru = new Map(cpmkBaru.map((c) => [JSON.stringify([c.mataKuliahId, c.kode]), c.id]));
      for (const c of cpmkLama) {
        const idBaru = idCpmkBaru.get(JSON.stringify([c.mataKuliahId, c.kode]));
        if (idBaru) petaCpmk.set(c.id, idBaru);
      }

      // 3. Sub-CPMK
      const petaSub = new Map<string, string>();
      const subLama = await tx.subCPMK.findMany({ where: { tahunAjaranId: sumberId } });
      if (subLama.length > 0) {
        await tx.subCPMK.createMany({
          data: subLama.map((s) => ({
            kode: s.kode,
            deskripsi: s.deskripsi,
            mataKuliahId: s.mataKuliahId,
            tahunAjaranId: baru.id,
          })),
        });
      }
      const subBaru = await tx.subCPMK.findMany({
        where: { tahunAjaranId: baru.id },
        select: { id: true, kode: true, mataKuliahId: true },
      });
      const idSubBaru = new Map(subBaru.map((s) => [JSON.stringify([s.mataKuliahId, s.kode]), s.id]));
      for (const s of subLama) {
        const idBaru = idSubBaru.get(JSON.stringify([s.mataKuliahId, s.kode]));
        if (idBaru) petaSub.set(s.id, idBaru);
      }

      // 3b. Kaitan CPMK <-> Sub-CPMK beserta bobotnya
      const kaitanLama = await tx.cpmkSub.findMany({ where: { cpmk: { tahunAjaranId: sumberId } } });
      const dataKaitan = kaitanLama.flatMap((k) => {
        const cpmkBaruId = petaCpmk.get(k.cpmkId);
        const subBaruId = petaSub.get(k.subCpmkId);
        return cpmkBaruId && subBaruId ? [{ cpmkId: cpmkBaruId, subCpmkId: subBaruId, bobot: k.bobot }] : [];
      });
      if (dataKaitan.length > 0) await tx.cpmkSub.createMany({ data: dataKaitan });

      // 4. Kelas dan tugas
      const petaKelas = new Map<string, string>();
      const kelasLama = await tx.kelasMK.findMany({ where: { tahunAjaranId: sumberId } });
      if (kelasLama.length > 0) {
        await tx.kelasMK.createMany({
          data: kelasLama.map((kelas) => ({
            nama: kelas.nama,
            mataKuliahId: kelas.mataKuliahId,
            dosenId: kelas.dosenId,
            tahunAjaranId: baru.id,
          })),
        });
      }
      const kelasBaru = await tx.kelasMK.findMany({
        where: { tahunAjaranId: baru.id },
        select: { id: true, mataKuliahId: true, nama: true },
      });
      const idKelasBaru = new Map(kelasBaru.map((kelas) => [JSON.stringify([kelas.mataKuliahId, kelas.nama]), kelas.id]));
      for (const kelas of kelasLama) {
        const idBaru = idKelasBaru.get(JSON.stringify([kelas.mataKuliahId, kelas.nama]));
        if (idBaru) petaKelas.set(kelas.id, idBaru);
      }

      const petaTugas = new Map<string, string>();
      const tugasLama = await tx.tugas.findMany({ where: { tahunAjaranId: sumberId } });
      const dataTugas = tugasLama.map((t) => {
        const kelasId = petaKelas.get(t.kelasId);
        if (!kelasId) throw new Error(`Kelas tugas "${t.nama}" tidak ditemukan pada Tahun Ajaran sumber.`);
        return {
            nama: t.nama,
            pertemuanKe: t.pertemuanKe,
            bobot: t.bobot,
            mataKuliahId: t.mataKuliahId,
            tahunAjaranId: baru.id,
            kelasId,
        };
      });
      const tugasBaru = dataTugas.length > 0
        ? await tx.tugas.createManyAndReturn({
            data: dataTugas,
            select: { id: true, nama: true, pertemuanKe: true, bobot: true, mataKuliahId: true, kelasId: true },
          })
        : [];
      const antreanIdTugas = new Map<string, string[]>();
      for (const tugas of tugasBaru) {
        const kunci = JSON.stringify([tugas.nama, tugas.pertemuanKe, tugas.bobot, tugas.mataKuliahId, tugas.kelasId]);
        const antrean = antreanIdTugas.get(kunci) ?? [];
        antrean.push(tugas.id);
        antreanIdTugas.set(kunci, antrean);
      }
      for (const [indeks, t] of tugasLama.entries()) {
        const tugasBaruData = dataTugas[indeks];
        const kunci = JSON.stringify([tugasBaruData.nama, tugasBaruData.pertemuanKe, tugasBaruData.bobot, tugasBaruData.mataKuliahId, tugasBaruData.kelasId]);
        const idBaru = antreanIdTugas.get(kunci)?.shift();
        if (!idBaru) throw new Error(`Tugas "${t.nama}" gagal dipetakan ke Tahun Ajaran baru.`);
        petaTugas.set(t.id, idBaru);
      }

      // 5. Pemetaan Sub-CPMK <-> Tugas
      const distribusiLama = await tx.distribusiSubCPMK.findMany({
        where: { tugas: { tahunAjaranId: sumberId } },
      });
      const dataDistribusi = distribusiLama.flatMap((d) => {
        const subBaru = petaSub.get(d.subCpmkId);
        const tugasBaru = petaTugas.get(d.tugasId);
        return subBaru && tugasBaru ? [{ subCpmkId: subBaru, tugasId: tugasBaru, sumber: d.sumber }] : [];
      });
      if (dataDistribusi.length > 0) {
        await tx.distribusiSubCPMK.createMany({ data: dataDistribusi });
      }
    },
    { timeout: 60000, maxWait: 10000 }
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function aktifkanTahunAjaran(id: string) {
  await pastikanAdmin();

  await prisma.$transaction([
    prisma.tahunAjaran.updateMany({ where: { status: "AKTIF" }, data: { status: "ARSIP" } }),
    prisma.tahunAjaran.update({ where: { id }, data: { status: "AKTIF" } }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function hitungDataTerkaitTahunAjaran(id: string) {
  await pastikanAdmin();
  const [cpmk, subCpmk, tugas, nilai, pendaftaran, penugasan] = await Promise.all([
    prisma.cPMK.count({ where: { tahunAjaranId: id } }),
    prisma.subCPMK.count({ where: { tahunAjaranId: id } }),
    prisma.tugas.count({ where: { tahunAjaranId: id } }),
    prisma.nilai.count({ where: { tahunAjaranId: id } }),
    prisma.pendaftaranMK.count({ where: { tahunAjaranId: id } }),
    prisma.penugasanDosenMK.count({ where: { tahunAjaranId: id } }),
  ]);
  return cpmk + subCpmk + tugas + nilai + pendaftaran + penugasan;
}

export async function deleteTahunAjaran(formData: FormData) {
  await pastikanAdmin();
  const id = formData.get("id") as string;

  const target = await prisma.tahunAjaran.findUnique({ where: { id } });
  if (!target) return { error: "Tahun Ajaran tidak ditemukan." };
  if (target.status === "AKTIF") {
    return { error: "Tidak bisa menghapus Tahun Ajaran yang sedang aktif. Aktifkan yang lain dulu." };
  }

  await prisma.tahunAjaran.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}