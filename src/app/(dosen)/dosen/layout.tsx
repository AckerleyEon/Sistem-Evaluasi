import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DosenShell } from "@/components/dosen/DosenShell";
import { dosenSaatIni } from "@/lib/asesmen";
import { getKonteksTahunAjaranDosen } from "@/lib/tahun-ajaran";

export default async function DosenLayout({ children }: { children: ReactNode }) {
  const dosen = await dosenSaatIni();
  if (!dosen) redirect("/login");
  const { daftar, selected } = await getKonteksTahunAjaranDosen(dosen.id);

  return (
    <DosenShell
      nama={dosen.gelar ? `${dosen.nama}, ${dosen.gelar}` : dosen.nama}
      nip={dosen.nip}
      labelTA={selected?.label ?? null}
      tahunAjaranId={selected?.id ?? null}
      daftarTA={daftar.map(({ id, label, status }) => ({ id, label, status }))}
      arsip={selected?.status === "ARSIP"}
    >
      {children}
    </DosenShell>
  );
}
