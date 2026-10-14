import { loadHero } from "@/lib/hero-data";
import RuleList from "@/components/RuleList";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const state = await loadHero();
  if (!state) return null;

  const { rules } = state;
  const active = rules.filter((r) => r.is_active);
  const friday = active.filter((r) => r.category === "friday").sort((a, b) => b.xp - a.xp);
  const thursday = active.filter((r) => r.category === "thursday").sort((a, b) => b.xp - a.xp);

  // سقف الجمعة: كل حاجة ممكن أي ولد يعملها، من غير مراكز المسابقة
  const fridayMax = friday
    .filter((r) => !/_(1st|2nd|3rd)$/.test(r.code))
    .reduce((n, r) => n + r.xp, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">📅 تحديات الأسبوع</h2>
        <span className="text-[11px] text-slate-400">الخادم بيسجّلها</span>
      </div>

      <div className="g-card p-4 text-center">
        <p className="text-xs text-slate-400">لو حضرت كل حاجة يوم الجمعة</p>
        <p className="font-bold text-4xl text-amber-400 tabular-nums mt-1" dir="ltr">
          +{fridayMax}
        </p>
        <p className="text-[11px] text-slate-500">نقطة في يوم واحد 🔥</p>
      </div>

      <RuleList
        rules={friday}
        color="#f2a900"
        title="يوم الجمعة"
        note="أكبر مصدر نقط"
      />
      <RuleList
        rules={thursday}
        color="#22d3ee"
        title="يوم الخميس"
        note="Zoom والمسابقة"
      />

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
        النقط دي بتتسجّل من الخادم بعد ما يتأكد من حضورك — مش بتتعلّم بنفسك.
      </p>
    </div>
  );
}
