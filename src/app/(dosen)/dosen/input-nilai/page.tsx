import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAjaranDosen } from "@/lib/tahun-ajaran";

export default async function DaftarMataKuliahInputNilaiPage() {
  const session = await auth();
  const dosenId = session?.user.dosenId;
  const ta = dosenId ? await getTahunAjaranDosen(dosenId) : null;
  if (!dosenId || !ta) {
    return (
      <section className="rounded-2xl border border-[#E5E9F0] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <h1 className="text-lg font-bold text-[#0F172A]">Belum ada mata kuliah untuk dinilai</h1>
        <p className="mt-2 text-sm text-[#64748B]">Hubungi administrator untuk mendapatkan penugasan mata kuliah atau kelas.</p>
      </section>
    );
  }

  const daftarMK = await prisma.mataKuliah.findMany({
    where: {
      OR: [
        { penugasan: { some: { dosenId, tahunAjaranId: ta.id } } },
        { kelas: { some: { dosenId, tahunAjaranId: ta.id } } },
      ],
    },
    orderBy: { kode: "asc" },
    select: { id: true },
    take: 1,
  });

  if (daftarMK[0]) redirect(`/dosen/input-nilai/${daftarMK[0].id}`);

  return (
    <section className="rounded-2xl border border-[#E5E9F0] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FC] text-[#1D4ED8]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </span>
      <h1 className="mt-4 text-lg font-bold text-[#0F172A]">Belum ada mata kuliah untuk dinilai</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#64748B]">
        Belum ada mata kuliah atau kelas yang ditugaskan kepada Anda pada T.A. yang dipilih. Hubungi administrator untuk memperbarui penugasan.
      </p>
    </section>
  );
}
