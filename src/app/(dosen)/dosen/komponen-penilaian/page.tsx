import { redirect } from "next/navigation";
import { dosenSaatIni, mataKuliahDiampu, tahunAjaranAktif } from "@/lib/asesmen";

export const dynamic = "force-dynamic";

// Halaman Kelola Asesmen bekerja per mata kuliah: arahkan ke MK pertama yang diampu.
export default async function KomponenPenilaianIndex() {
  const dosen = await dosenSaatIni();
  if (!dosen) redirect("/login");

  const ta = await tahunAjaranAktif();
  const daftar = ta ? await mataKuliahDiampu(dosen.id, ta.id) : [];
  if (daftar.length > 0) redirect(`/dosen/komponen-penilaian/${daftar[0].id}`);

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,.04),0_4px_12px_rgba(15,23,42,.04)]">
      <h2 className="text-[16px] font-bold">Belum ada mata kuliah</h2>
      <p className="mt-1 text-[13px] text-[#64748B]">
        {ta
          ? "Kamu belum ditugaskan mengampu mata kuliah pada tahun ajaran aktif. Hubungi admin prodi."
          : "Belum ada tahun ajaran aktif. Hubungi admin prodi."}
      </p>
    </div>
  );
}
