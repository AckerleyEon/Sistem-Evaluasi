import { ambilDashboard } from "@/lib/dashboard";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { GrafikCapaianAngkatan } from "@/components/admin/dashboard/GrafikCapaianAngkatan";
import { DonutPredikat } from "@/components/admin/dashboard/DonutPredikat";
import { KesiapanDosen } from "@/components/admin/dashboard/KesiapanDosen";
import { BatasBawahCPL } from "@/components/admin/dashboard/BatasBawahCPL";
import { InputAsesmen } from "@/components/admin/dashboard/InputAsesmen";
import { LogAktivitas } from "@/components/admin/dashboard/LogAktivitas";

export const dynamic = "force-dynamic";

export default async function DashboardAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ta?: string }>;
}) {
  const { ta } = await searchParams;
  const data = await ambilDashboard(ta);

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard Administrator</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Belum ada tahun ajaran. Buat tahun ajaran terlebih dahulu di menu Tahun Ajaran.
        </p>
      </div>
    );
  }

  const { kpi } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold leading-8 text-[#0F172A]">Dashboard Administrator</h1>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
          Tahun Ajaran {data.tahunAjaran.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Capaian CPL"
          angka={kpi.totalCPL}
          satuan="Butir"
          badge={kpi.rataCPL === null ? undefined : `Rata-rata ${kpi.rataCPL}%`}
          href="/admin/data-master/cpl"
          warnaAngka="text-[#1D4ED8]"
        />
        <KpiCard
          label="Total Dosen"
          angka={kpi.totalDosenAkun}
          satuan="Orang"
          badge={`${kpi.totalDosenAktif} mengampu T.A.`}
          href="/admin/dosen"
          sorot
        />
        <KpiCard
          label="Mata Kuliah"
          angka={kpi.totalMK}
          satuan="MK"
          badge={`${kpi.totalSKS} SKS`}
          nadaBadge="biru"
          href="/admin/data-master/mata-kuliah"
        />
        <KpiCard
          label="Mahasiswa"
          angka={kpi.totalMahasiswa}
          satuan="Mhs"
          badge={kpi.persenLengkap === null ? undefined : `${kpi.persenLengkap}% lengkap`}
          href="/admin/laporan/mahasiswa"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <GrafikCapaianAngkatan data={data.angkatan} />
          <DonutPredikat
            segmen={data.predikat}
            total={data.totalSampel}
            persenLulus={data.persenLulus}
            jumlahRemedial={data.jumlahRemedial}
          />

          <KesiapanDosen baris={data.kesiapan} tahunAjaranId={data.tahunAjaran.id} />
          <BatasBawahCPL passingGrade={data.passingGrade} histogram={data.histogram} />
          <InputAsesmen data={data.asesmen} labelBulan={data.labelBulanAktif} puncak={data.puncakInput} />
          <LogAktivitas entri={data.log} />
      </div>
    </div>
  );
}
