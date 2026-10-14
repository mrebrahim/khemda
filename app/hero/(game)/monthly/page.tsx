import { loadHero } from "@/lib/hero-data";
import RuleList from "@/components/RuleList";

export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  const state = await loadHero();
  if (!state) return null;

  const monthly = state.rules
    .filter((r) => r.is_active && r.category === "monthly")
    .sort((a, b) => b.xp - a.xp);

  const total = monthly.reduce((n, r) => n + r.xp, 0);
  const massXp = state.rules.find((r) => r.code === "mass")?.xp ?? 25;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">⭐ مهمات الشهر</h2>
        <span className="text-[11px] text-slate-400">الجمعة التالتة</span>
      </div>

      <div className="g-card g-glow-gold p-4 text-center">
        <p className="text-4xl mb-1.5">⛪</p>
        <p className="font-bold text-white">القداس الشهري</p>
        <p className="text-xs text-slate-400 mt-1">
          تالت جمعة في الشهر — أكبر فرصة نقط في الشهر كله
        </p>
        <p className="font-bold text-3xl text-amber-400 tabular-nums mt-2.5" dir="ltr">
          +{massXp + total}
        </p>
        <p className="text-[11px] text-slate-500">
          لو حضرت القداس وقريت القرايات
        </p>
      </div>

      <RuleList
        rules={monthly}
        color="#a78bfa"
        title="بونصات الشهر"
        note="فوق نقط القداس العادي"
      />

      <section className="g-card p-4">
        <h3 className="font-bold text-white text-sm mb-2">📜 إزاي تاخد بونص القرايات؟</h3>
        <ol className="space-y-2 text-sm text-slate-300 list-decimal pr-4">
          <li>كلّم خادمك قبل القداس الشهري وقوله إنك عايز تقرا</li>
          <li>ذاكر القراية وافهمها كويس</li>
          <li>اقراها في القداس واشرحها</li>
          <li>الخادم هو اللي بيسجّلك البونص بعدها</li>
        </ol>
      </section>
    </div>
  );
}
