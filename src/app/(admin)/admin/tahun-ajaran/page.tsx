import type { Metadata } from "next";
import { getSemuaTahunAjaran } from "@/lib/tahun-ajaran";
import { TahunAjaranWorkspace } from "@/components/admin/tahun-ajaran/TahunAjaranWorkspace";

export const metadata: Metadata = { title: "Tahun Ajaran" };

export default async function TahunAjaranPage() {
  const daftar = await getSemuaTahunAjaran();
  return <TahunAjaranWorkspace daftarAwal={daftar} />;
}