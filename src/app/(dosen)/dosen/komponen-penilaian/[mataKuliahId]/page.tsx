import { notFound, redirect } from "next/navigation";
import { AsesmenWorkspace } from "@/components/dosen/asesmen/AsesmenWorkspace";
import { ambilAsesmen, dosenSaatIni } from "@/lib/asesmen";

export const dynamic = "force-dynamic";

export default async function KelolaAsesmenPage({ params }: { params: Promise<{ mataKuliahId: string }> }) {
  const { mataKuliahId } = await params;
  const dosen = await dosenSaatIni();
  if (!dosen) redirect("/login");

  const data = await ambilAsesmen(dosen.id, mataKuliahId);
  if (!data) notFound();

  return <AsesmenWorkspace key={data.mataKuliah.id} data={data} />;
}
