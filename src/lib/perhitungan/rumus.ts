export type HasilHitung = { nilai: number; statusLengkap: boolean };

export function rataBerbobot(item: { nilai: number; bobot: number }[]): number {
  if (item.length === 0) return 0;
  const totalBobot = item.reduce((jumlah, i) => jumlah + i.bobot, 0);
  // Jika semua bobot 0 (data lama), jatuh ke rata-rata biasa.
  if (totalBobot <= 0) return item.reduce((jumlah, i) => jumlah + i.nilai, 0) / item.length;
  return item.reduce((jumlah, i) => jumlah + i.nilai * i.bobot, 0) / totalBobot;
}