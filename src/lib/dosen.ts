export function namaDenganGelar(d: { nama: string; gelar: string | null }) {
  return d.gelar ? `${d.nama} ${d.gelar}` : d.nama;
}