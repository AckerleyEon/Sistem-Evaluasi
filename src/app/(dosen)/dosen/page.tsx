import { auth } from "@/auth";
import { DashboardDosen } from "@/components/dosen/dashboard/DashboardDosen";
import { ambilDashboardDosen } from "@/lib/dashboard-dosen";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export const dynamic = "force-dynamic";

export default async function DosenDashboardPage() {
  const session = await auth();
  const dosenId = session?.user.dosenId;
  const ta = dosenId ? await getTahunAjaranDosen(dosenId) : null;
  const data = dosenId ? await ambilDashboardDosen(dosenId, ta?.id ?? null) : null;

  return <DashboardDosen data={data} />;
}