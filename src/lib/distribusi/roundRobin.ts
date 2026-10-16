export function distribusikanSeimbang<T, U extends { id: string }>(
  itemPerluDistribusi: T[],
  daftarTujuan: U[],
  jumlahAwalPerTujuan: Map<string, number>
): { item: T; tujuan: U }[] {
  if (daftarTujuan.length === 0) return [];

  const jumlahSaatIni = new Map(jumlahAwalPerTujuan);
  for (const tujuan of daftarTujuan) {
    if (!jumlahSaatIni.has(tujuan.id)) jumlahSaatIni.set(tujuan.id, 0);
  }

  const hasil: { item: T; tujuan: U }[] = [];

  for (const item of itemPerluDistribusi) {
    // pilih tujuan dengan jumlah keterkaitan PALING SEDIKIT saat ini
    let tujuanTerpilih = daftarTujuan[0];
    let jumlahTerkecil = jumlahSaatIni.get(tujuanTerpilih.id)!;

    for (const tujuan of daftarTujuan) {
      const jumlah = jumlahSaatIni.get(tujuan.id)!;
      if (jumlah < jumlahTerkecil) {
        tujuanTerpilih = tujuan;
        jumlahTerkecil = jumlah;
      }
    }

    hasil.push({ item, tujuan: tujuanTerpilih });
    jumlahSaatIni.set(tujuanTerpilih.id, jumlahTerkecil + 1);
  }

  return hasil;
}