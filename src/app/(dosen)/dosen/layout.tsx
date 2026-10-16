import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DosenShell } from "@/components/dosen/DosenShell";
import { dosenSaatIni, tahunAjaranAktif } from "@/lib/asesmen";

export default async function DosenLayout({ children }: { children: ReactNode }) {
  const dosen = await dosenSaatIni();
  if (!dosen) redirect("/login");
  const ta = await tahunAjaranAktif();

  return (
    <DosenShell
      nama={dosen.gelar ? `${dosen.nama}, ${dosen.gelar}` : dosen.nama}
      nip={dosen.nip}
      labelTA={ta?.label ?? null}
    >
      {children}
    </DosenShell>
  );
}
