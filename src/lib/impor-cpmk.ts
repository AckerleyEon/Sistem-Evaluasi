export type BarisCPMKExcel = {
  baris: number;
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
};

export type CPMKImpor = {
  kode: string;
  deskripsi: string;
  bobot: number;
  baris: number;
  sub: SubCPMKImpor[];
};

export type MataKuliahImpor = {
  kode: string;
  nama: string;
  baris: number;
  cpmk: CPMKImpor[];
};

export type GalatImporCPMK = { baris: number; pesan: string };

export type DataImporCPMK = {
  mataKuliah: MataKuliahImpor[];
  galat: GalatImporCPMK[];
  jumlahBaris: number;
  jumlahPemetaan: number;
  barisSumber: BarisCPMKExcel[];
};

const rapikan = (value: string) => value.replace(/\s+/g, " ").trim();

export function normalisasiKodeMK(value: string) {
  return rapikan(value).replace(/\s/g, "").toUpperCase();
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
  const subMap = new Map<string, { deskripsi: string; baris: number }>();
  const barisPemetaan = new Set<string>();

  const tambahGalat = (barisKe: number, pesan: string) => galat.push({ baris: barisKe, pesan });

  for (const row of baris) {
    const kodeMK = rapikan(row.kodeMK);
    const namaMK = rapikan(row.namaMK);
    const kodeCPMK = rapikan(row.kodeCPMK).toUpperCase();
    const kodeSubCPMK = rapikan(row.kodeSubCPMK).toUpperCase();
    const deskripsiCPMK = rapikan(row.deskripsiCPMK);
    const deskripsiSubCPMK = rapikan(row.deskripsiSubCPMK);
    const bobotCPMK = bacaBobotPersen(row.bobotCPMK);
    const bobotSubCPMK = bacaBobotPersen(row.bobotSubCPMK);

    if (!kodeMK || !namaMK) tambahGalat(row.baris, "Kode dan nama mata kuliah wajib diisi.");
    if (!/^CPMK-\d{1,3}$/i.test(kodeCPMK)) tambahGalat(row.baris, "Kode CPMK harus berformat CPMK-1, CPMK-2, dan seterusnya.");
    if (!/^Sub-CPMK-\d{1,3}$/i.test(kodeSubCPMK)) tambahGalat(row.baris, "Kode Sub-CPMK harus berformat Sub-CPMK-1, Sub-CPMK-2, dan seterusnya.");
    if (bobotCPMK === null) tambahGalat(row.baris, "Bobot CPMK harus 1–100, atau pecahan 0–1 (misalnya 0,25).");
    if (bobotSubCPMK === null) tambahGalat(row.baris, "Bobot Sub-CPMK harus 1–100, atau pecahan 0–1 (misalnya 0,50).");
    if (deskripsiCPMK.length < 10 || deskripsiCPMK.length > 500) tambahGalat(row.baris, "Deskripsi CPMK harus 10–500 karakter.");
    if (deskripsiSubCPMK.length < 10 || deskripsiSubCPMK.length > 500) tambahGalat(row.baris, "Deskripsi Sub-CPMK harus 10–500 karakter.");
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
      tambahGalat(row.baris, `${kodeCPMK} sudah memetakan ${kodeSubCPMK} di mata kuliah ini.`);
      continue;
    }
    barisPemetaan.add(pemetaanKey);

    let mk = mkMap.get(mkKey);
    if (!mk) {
      mk = { kode: kodeMK, nama: namaMK, baris: row.baris, cpmk: [] };
      mkMap.set(mkKey, mk);
    } else if (mk.nama.toLowerCase() !== namaMK.toLowerCase()) {
      tambahGalat(row.baris, `Nama mata kuliah berbeda dari baris ${mk.baris} untuk kode ${kodeMK}.`);
    }

    let cpmk = cpmkMap.get(cpmkKey);
    if (!cpmk) {
      cpmk = { kode: kodeCPMK, deskripsi: deskripsiCPMK, bobot: bobotCPMK, baris: row.baris, sub: [] };
      cpmkMap.set(cpmkKey, cpmk);
      mk.cpmk.push(cpmk);
    } else if (cpmk.deskripsi !== deskripsiCPMK || cpmk.bobot !== bobotCPMK) {
      tambahGalat(row.baris, `${kodeCPMK} memiliki deskripsi atau bobot yang berbeda dari baris ${cpmk.baris}.`);
    }

    const subTerdaftar = subMap.get(subKey);
    if (!subTerdaftar) {
      subMap.set(subKey, { deskripsi: deskripsiSubCPMK, baris: row.baris });
    } else if (subTerdaftar.deskripsi !== deskripsiSubCPMK) {
      tambahGalat(row.baris, `${kodeSubCPMK} memiliki deskripsi berbeda dari baris ${subTerdaftar.baris} dalam mata kuliah yang sama.`);
    }
    cpmk.sub.push({ kode: kodeSubCPMK, deskripsi: deskripsiSubCPMK, bobot: bobotSubCPMK, baris: row.baris });
  }

  for (const mk of mkMap.values()) {
    const totalBobotCPMK = mk.cpmk.reduce((total, cpmk) => total + cpmk.bobot, 0);
    if (totalBobotCPMK > 100) {
      for (const cpmk of mk.cpmk) {
        for (const sub of cpmk.sub) {
          tambahGalat(sub.baris, `Total bobot CPMK untuk ${mk.kode} adalah ${totalBobotCPMK}%; maksimal 100%.`);
        }
      }
    }
    for (const cpmk of mk.cpmk) {
      const totalBobotSub = cpmk.sub.reduce((total, sub) => total + sub.bobot, 0);
      if (totalBobotSub > 100) {
        for (const sub of cpmk.sub) {
          tambahGalat(sub.baris, `Total bobot Sub-CPMK untuk ${mk.kode} / ${cpmk.kode} adalah ${totalBobotSub}%; maksimal 100%.`);
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
  const nomorBarisGalat = new Set(galat.map((item) => item.baris));
  return validasiBarisCPMK(data.barisSumber.filter((item) => !nomorBarisGalat.has(item.baris)));
}
