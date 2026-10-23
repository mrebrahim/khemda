import { loadHero } from "@/lib/hero-data";
import { xpReport } from "@/lib/xp-report";
import XpReportView from "@/components/XpReport";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const state = await loadHero();
  if (!state) return null;

  const report = await xpReport(state.hero.studentId, state.seasonId);

  return (
    <div className="space-y-3 pt-3">
      <div className="px-1">
        <h2 className="sec-title font-bold text-white tracking-wide">تقرير نقطك</h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          كل نقطة خدتها الموسم ده — على إيه ويوم إيه.
        </p>
      </div>

      <XpReportView report={report} tone="dark" />
    </div>
  );
}
