export type BarisCPMKExcel = {
  baris: number;
  sumber?: string;
  kodeMK: string;
  namaMK: string;
  kodeCPMK: string;
  bobotCPMK: string;
  deskripsiCPMK: string;
  kodeSubCPMK: string;
  bobotSubCPMK: string;
  deskripsiSubCPMK: string;
};

export type SubCPMKImpor = {
  kode: string;
  deskripsi: string;
  bobot: number;
  baris: number;
  sumber?: string;
};

export type CPMKImpor = {
  kode: string;
  deskripsi: string;
  bobot: number;
  baris: number;
  sumber?: string;
  sub: SubCPMKImpor[];
};

export type MataKuliahImpor = {
  kode: string;
  nama: string;
  baris: number;
  sumber?: string;
  cpmk: CPMKImpor[];
};

export type GalatImporCPMK = { baris: number; pesan: string; sumber?: string };

export type DataImporCPMK = {
  mataKuliah: MataKuliahImpor[];
  galat: GalatImporCPMK[];
  jumlahBaris: number;
  jumlahPemetaan: number;
  barisSumber: BarisCPMKExcel[];
};

export type KolomPemetaanCPMK =
  | "kodeCPMK"
  | "bobotCPMK"
  | "deskripsiCPMK"
  | "kodeSubCPMK"
  | "bobotSubCPMK"
  | "deskripsiSubCPMK";

export const BATAS_IMPOR_CPMK = {
  jumlahFile: 300,
  ukuranPerFile: 20 * 1024 * 1024,
  ukuranTotal: 1024 * 1024 * 1024,
  jumlahBaris: 5000,
} as const;

const rapikan = (value: string) => value.replace(/\s+/g, " ").trim();

export function normalisasiKodeMK(value: string) {
  return rapikan(value).replace(/\s/g, "").toUpperCase();
}

export function cariMataKuliahDariNamaFileCPMK<T extends { kode: string; nama: string }>(
  namaFile: string,
  mataKuliah: T[],
): T | undefined {
  if (!namaFile.toLowerCase().endsWith(".xlsx")) return undefined;
  const dasar = namaFile.replace(/\.xlsx$/i, "").replace(/_(pemetaan)$/i, "");
  const normalisasi = (nilai: string) =>
    nilai.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id").replace(/[^a-z0-9]/g, "");
  const identitas = normalisasi(dasar);
  const cocok = mataKuliah.filter((item) => normalisasi(`${item.kode}_${item.nama}`) === identitas);
  return cocok.length === 1 ? cocok[0] : undefined;
}

export function petakanKolomPemetaanCPMK(header: string[]): Map<KolomPemetaanCPMK, number> | null {
  const wajib: KolomPemetaanCPMK[] = [
    "kodeCPMK",
    "bobotCPMK",
    "deskripsiCPMK",
    "kodeSubCPMK",
    "bobotSubCPMK",
    "deskripsiSubCPMK",
  ];
  const kolom = new Map<KolomPemetaanCPMK, number>();
  header.forEach((judul, index) => {
    const nama = judul.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (nama === "kodecpmk") kolom.set("kodeCPMK", index + 1);
    if (nama === "bobotcpmk") kolom.set("bobotCPMK", index + 1);
    if (nama === "deskripsicpmk") kolom.set("deskripsiCPMK", index + 1);
    if (nama === "kodesubcpmk") kolom.set("kodeSubCPMK", index + 1);
    if (nama === "bobotsubcpmk") kolom.set("bobotSubCPMK", index + 1);
    if (nama === "deskripsisubcpmk") kolom.set("deskripsiSubCPMK", index + 1);
  });
  return wajib.every((nama) => kolom.has(nama)) ? kolom : null;
}

export function bacaBobotPersen(value: string): number | null {
  const teks = rapikan(value).replace(",", ".");
  const persen = teks.endsWith("%");
  const angka = Number(persen ? teks.slice(0, -1) : teks);
  if (!Number.isFinite(angka) || angka <= 0) return null;

  const bobot = persen ? angka : angka <= 1 ? angka * 100 : angka;
  const bulat = Math.round(bobot);
  if (bulat < 1 || bulat > 100 || Math.abs(bobot - bulat) > 0.001) return null;
  return bulat;
}

export function validasiBarisCPMK(baris: BarisCPMKExcel[]): DataImporCPMK {
  const galat: GalatImporCPMK[] = [];
  const mkMap = new Map<string, MataKuliahImpor>();
  const cpmkMap = new Map<string, CPMKImpor>();
  const subMap = new Map<string, { deskripsi: string; baris: number; sumber?: string }>();
  const barisPemetaan = new Set<string>();

  const tambahGalat = (row: Pick<BarisCPMKExcel, "baris" | "sumber">, pesan: string) =>
    galat.push({ baris: row.baris, sumber: row.sumber, pesan });

  for (const row of baris) {
    const kodeMK = rapikan(row.kodeMK);
    const namaMK = rapikan(row.namaMK);
    const kodeCPMK = rapikan(row.kodeCPMK).toUpperCase();
    const kodeSubCPMK = rapikan(row.kodeSubCPMK).toUpperCase();
    const deskripsiCPMK = rapikan(row.deskripsiCPMK);
    const deskripsiSubCPMK = rapikan(row.deskripsiSubCPMK);
    const bobotCPMK = bacaBobotPersen(row.bobotCPMK);
    const bobotSubCPMK = bacaBobotPersen(row.bobotSubCPMK);

    if (!kodeMK || !namaMK) tambahGalat(row, "Kode dan nama mata kuliah wajib diisi.");
    if (!/^CPMK-\d{1,3}$/i.test(kodeCPMK)) tambahGalat(row, "Kode CPMK harus berformat CPMK-1, CPMK-2, dan seterusnya.");
    if (!/^Sub-CPMK-\d{1,3}$/i.test(kodeSubCPMK)) tambahGalat(row, "Kode Sub-CPMK harus berformat Sub-CPMK-1, Sub-CPMK-2, dan seterusnya.");
    if (bobotCPMK === null) tambahGalat(row, "Bobot CPMK harus 1–100, atau pecahan 0–1 (misalnya 0,25).");
    if (bobotSubCPMK === null) tambahGalat(row, "Bobot Sub-CPMK harus 1–100, atau pecahan 0–1 (misalnya 0,50).");
    if (deskripsiCPMK.length < 10 || deskripsiCPMK.length > 500) tambahGalat(row, "Deskripsi CPMK harus 10–500 karakter.");
    if (deskripsiSubCPMK.length < 10 || deskripsiSubCPMK.length > 500) tambahGalat(row, "Deskripsi Sub-CPMK harus 10–500 karakter.");
    if (
      !kodeMK ||
      !namaMK ||
      !/^CPMK-\d{1,3}$/i.test(kodeCPMK) ||
      !/^Sub-CPMK-\d{1,3}$/i.test(kodeSubCPMK) ||
      bobotCPMK === null ||
      bobotSubCPMK === null ||
      deskripsiCPMK.length < 10 ||
      deskripsiCPMK.length > 500 ||
      deskripsiSubCPMK.length < 10 ||
      deskripsiSubCPMK.length > 500
    ) {
      continue;
    }

    const mkKey = normalisasiKodeMK(kodeMK);
    const cpmkKey = `${mkKey}|${kodeCPMK}`;
    const subKey = `${mkKey}|${kodeSubCPMK}`;
    const pemetaanKey = `${cpmkKey}|${kodeSubCPMK}`;
    if (barisPemetaan.has(pemetaanKey)) {
      tambahGalat(row, `${kodeCPMK} sudah memetakan ${kodeSubCPMK} di mata kuliah ini.`);
      continue;
    }
    barisPemetaan.add(pemetaanKey);

    let mk = mkMap.get(mkKey);
    if (!mk) {
      mk = { kode: kodeMK, nama: namaMK, baris: row.baris, sumber: row.sumber, cpmk: [] };
      mkMap.set(mkKey, mk);
    } else if (mk.nama.toLowerCase() !== namaMK.toLowerCase()) {
      tambahGalat(row, `Nama mata kuliah berbeda dari baris ${mk.baris} untuk kode ${kodeMK}.`);
    }

    let cpmk = cpmkMap.get(cpmkKey);
    if (!cpmk) {
      cpmk = { kode: kodeCPMK, deskripsi: deskripsiCPMK, bobot: bobotCPMK, baris: row.baris, sumber: row.sumber, sub: [] };
      cpmkMap.set(cpmkKey, cpmk);
      mk.cpmk.push(cpmk);
    } else if (cpmk.deskripsi !== deskripsiCPMK || cpmk.bobot !== bobotCPMK) {
      tambahGalat(row, `${kodeCPMK} memiliki deskripsi atau bobot yang berbeda dari baris ${cpmk.baris}.`);
    }

    const subTerdaftar = subMap.get(subKey);
    if (!subTerdaftar) {
      subMap.set(subKey, { deskripsi: deskripsiSubCPMK, baris: row.baris, sumber: row.sumber });
    } else if (subTerdaftar.deskripsi !== deskripsiSubCPMK) {
      tambahGalat(row, `${kodeSubCPMK} memiliki deskripsi berbeda dari baris ${subTerdaftar.baris} dalam mata kuliah yang sama.`);
    }
    cpmk.sub.push({ kode: kodeSubCPMK, deskripsi: deskripsiSubCPMK, bobot: bobotSubCPMK, baris: row.baris, sumber: row.sumber });
  }

  for (const mk of mkMap.values()) {
    const totalBobotCPMK = mk.cpmk.reduce((total, cpmk) => total + cpmk.bobot, 0);
    if (totalBobotCPMK > 100) {
      for (const cpmk of mk.cpmk) {
        for (const sub of cpmk.sub) {
          tambahGalat(sub, `Total bobot CPMK untuk ${mk.kode} adalah ${totalBobotCPMK}%; maksimal 100%.`);
        }
      }
    }
    for (const cpmk of mk.cpmk) {
      const totalBobotSub = cpmk.sub.reduce((total, sub) => total + sub.bobot, 0);
      if (totalBobotSub > 100) {
        for (const sub of cpmk.sub) {
          tambahGalat(sub, `Total bobot Sub-CPMK untuk ${mk.kode} / ${cpmk.kode} adalah ${totalBobotSub}%; maksimal 100%.`);
        }
      }
    }
  }

  return {
    mataKuliah: [...mkMap.values()],
    galat,
    jumlahBaris: baris.length,
    jumlahPemetaan: barisPemetaan.size,
    barisSumber: baris,
  };
}

export function saringBarisBergalat(data: DataImporCPMK, galat: GalatImporCPMK[]): DataImporCPMK {
  const kunciBarisGalat = new Set(galat.map((item) => `${item.sumber ?? ""}:${item.baris}`));
  return validasiBarisCPMK(
    data.barisSumber.filter((item) => !kunciBarisGalat.has(`${item.sumber ?? ""}:${item.baris}`)),
  );
}
