import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ambilDataLaporanCPL } from "@/lib/laporan-cpl";
import { LaporanCPLWorkspace } from "@/components/dosen/laporan/LaporanCPLWorkspace";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hasil Capaian" };

export default async function LaporanCPLPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ta = session.user.dosenId ? await getTahunAjaranDosen(session.user.dosenId) : null;
  const data = await ambilDataLaporanCPL(ta?.id);

  return <LaporanCPLWorkspace data={data} />;
}
