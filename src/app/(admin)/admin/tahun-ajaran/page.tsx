import { getSemuaTahunAjaran } from "@/lib/tahun-ajaran";
import { TahunAjaranWorkspace } from "@/components/admin/tahun-ajaran/TahunAjaranWorkspace";

export default async function TahunAjaranPage() {
  const daftar = await getSemuaTahunAjaran();
  return <TahunAjaranWorkspace daftarAwal={daftar} />;
}