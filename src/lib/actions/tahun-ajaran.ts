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
      for (const c of cpmkLama) {
        const cpmkBaru = await tx.cPMK.create({
          data: {
            kode: c.kode,
            deskripsi: c.deskripsi,
            bobot: c.bobot,
            mataKuliahId: c.mataKuliahId,
            tahunAjaranId: baru.id,
          },
        });
        petaCpmk.set(c.id, cpmkBaru.id);
      }

      // 3. Sub-CPMK
      const petaSub = new Map<string, string>();
      const subLama = await tx.subCPMK.findMany({ where: { tahunAjaranId: sumberId } });
      for (const s of subLama) {
        const baruSub = await tx.subCPMK.create({
          data: {
            kode: s.kode,
            deskripsi: s.deskripsi,
            mataKuliahId: s.mataKuliahId,
            tahunAjaranId: baru.id,
          },
        });
        petaSub.set(s.id, baruSub.id);
      }

      // 3b. Kaitan CPMK <-> Sub-CPMK beserta bobotnya
      const kaitanLama = await tx.cpmkSub.findMany({ where: { cpmk: { tahunAjaranId: sumberId } } });
      const dataKaitan = kaitanLama.flatMap((k) => {
        const cpmkBaruId = petaCpmk.get(k.cpmkId);
        const subBaruId = petaSub.get(k.subCpmkId);
        return cpmkBaruId && subBaruId ? [{ cpmkId: cpmkBaruId, subCpmkId: subBaruId, bobot: k.bobot }] : [];
      });
      if (dataKaitan.length > 0) await tx.cpmkSub.createMany({ data: dataKaitan });

      // 4. Tugas
      const petaTugas = new Map<string, string>();
      const tugasLama = await tx.tugas.findMany({ where: { tahunAjaranId: sumberId } });
      for (const t of tugasLama) {
        const baruTugas = await tx.tugas.create({
          data: {
            nama: t.nama,
            pertemuanKe: t.pertemuanKe,
            bobot: t.bobot,
            mataKuliahId: t.mataKuliahId,
            tahunAjaranId: baru.id,
          },
        });
        petaTugas.set(t.id, baruTugas.id);
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
    { timeout: 30000, maxWait: 10000 }
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