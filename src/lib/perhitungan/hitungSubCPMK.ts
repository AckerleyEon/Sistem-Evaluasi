import { rataBerbobot, type HasilHitung } from "./rumus";

// Nilai Sub-CPMK = rata-rata berbobot nilai tugas terkait (bobot dari Tugas.bobot).
// Tugas yang belum ada nilainya diabaikan, hasilnya ditandai belum lengkap.
export function hitungSubCPMK(
  tugasTerkait: { id: string; bobot: number }[],
  skorPerTugas: Map<string, number>
): HasilHitung | null {
  if (tugasTerkait.length === 0) return null;

  const terisi: { nilai: number; bobot: number }[] = [];
  for (const t of tugasTerkait) {
    const skor = skorPerTugas.get(t.id);
    if (skor !== undefined) terisi.push({ nilai: skor, bobot: t.bobot });
  }

  return {
    nilai: terisi.length > 0 ? rataBerbobot(terisi) : 0,
    statusLengkap: terisi.length === tugasTerkait.length,
  };
}