"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { analisisImporMahasiswa } from "@/lib/actions/pendaftaran";
import { bacaKodeDariNamaFile, judulCocokDenganNamaMK, kunciKodeMK } from "@/lib/impor-mahasiswa-massal";

type BarisAnalisis = Extract<Awaited<ReturnType<typeof analisisImporMahasiswa>>, { ok: true }>["baris"];

export type HasilAnalisisFileMassal =
  | {
      ok: true;
      mk: { id: string; kode: string; nama: string };
      baris: BarisAnalisis;
      baru: number;
      sudahTerdaftar: number;
      galat: number;
      /** Judul pada nama file tampak berbeda dari nama MK di sistem (hanya peringatan). */
      peringatanJudul: string | null;
    }
  | { ok: false; error: string };

async function pastikanAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Hanya admin yang boleh mengimpor mahasiswa.");
  }
}

/**
 * Memeriksa SATU file dari impor massal. Mata kuliah ditentukan dari kode di awal nama file, lalu isi file diperiksa
 * dengan aturan yang sama seperti impor per mata kuliah. Klien memanggil ini satu file per panggilan supaya
 * tiap permintaan tetap di bawah batas ukuran Server Action.
 */
export async function analisisFileImporMassal(formData: FormData): Promise<HasilAnalisisFileMassal> {
  await pastikanAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "File tidak ditemukan." };

  const kode = bacaKodeDariNamaFile(file.name);
  if (!kode) {
    return { ok: false, error: "Nama file harus diawali kode mata kuliah, contoh UTM_101_Bahasa_Indonesia.xlsx." };
  }

  const semuaMK = await prisma.mataKuliah.findMany({ select: { id: true, kode: true, nama: true } });
  const cocok = semuaMK.filter((mk) => kunciKodeMK(mk.kode) === kode.kunci);
  if (cocok.length === 0) return { ok: false, error: `Mata kuliah ${kode.kodeAsli} tidak ditemukan di Data Master.` };
  if (cocok.length > 1) return { ok: false, error: `Kode ${kode.kodeAsli} cocok ke lebih dari satu mata kuliah.` };
  const [mk] = cocok;

  const hasil = await analisisImporMahasiswa(mk.id, formData);
  if (!hasil.ok) return hasil;

  return {
    ok: true,
    mk,
    baris: hasil.baris,
    baru: hasil.baru,
    sudahTerdaftar: hasil.sudahTerdaftar,
    galat: hasil.galat,
    peringatanJudul: judulCocokDenganNamaMK(kode.judul, mk.nama)
      ? null
      : `Judul pada nama file ("${kode.judul}") berbeda dari nama MK di sistem ("${mk.nama}"). Kode MK dipakai sebagai acuan.`,
  };
}
