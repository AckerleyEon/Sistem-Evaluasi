import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSemuaTahunAjaran } from "@/lib/tahun-ajaran";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const username = session?.user?.name ?? "Admin";
  const daftarTahunAjaran = await getSemuaTahunAjaran();

  return (
    <AdminShell username={username} daftarTahunAjaran={daftarTahunAjaran}>
      {children}
    </AdminShell>
  );
}