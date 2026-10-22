import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AsesmenWorkspace } from "@/components/dosen/asesmen/AsesmenWorkspace";
import { ambilAsesmen, dosenSaatIni } from "@/lib/asesmen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Komponen Penilaian" };

export default async function KelolaAsesmenPage({
  params,
  searchParams,
}: {
  params: Promise<{ mataKuliahId: string }>;
  searchParams: Promise<{ kelas?: string }>;
}) {
  const { mataKuliahId } = await params;
  const { kelas } = await searchParams;
  const dosen = await dosenSaatIni();
  if (!dosen) redirect("/login");

  const data = await ambilAsesmen(dosen.id, mataKuliahId, kelas);
  if (!data) notFound();

  return <AsesmenWorkspace key={`${data.mataKuliah.id}-${data.kelas?.id ?? "global"}`} data={data} />;
}
