import { rataBerbobot, type HasilHitung } from "./rumus";

// Nilai CPMK = rata-rata berbobot hasil Sub-CPMK (bobot dari SubCPMK.bobot).
// Sub-CPMK tanpa hasil (belum terhubung ke tugas) diabaikan dan membuat CPMK belum lengkap.
export function hitungCPMK(
  daftarSub: { id: string; bobot: number }[],
  hasilSub: Map<string, HasilHitung>
): HasilHitung | null {
  if (daftarSub.length === 0) return null;

  const terisi: { nilai: number; bobot: number }[] = [];
  let lengkap = true;
  for (const s of daftarSub) {
    const h = hasilSub.get(s.id);
    if (!h) {
      lengkap = false;
      continue;
    }
    terisi.push({ nilai: h.nilai, bobot: s.bobot });
    if (!h.statusLengkap) lengkap = false;
  }

  if (terisi.length === 0) return null;
  return { nilai: rataBerbobot(terisi), statusLengkap: lengkap };
}