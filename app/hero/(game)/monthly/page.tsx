import { loadHero } from "@/lib/hero-data";
import Image from "next/image";
import RuleList from "@/components/RuleList";
import { GFX } from "@/lib/assets";

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
    <div className="space-y-3 pt-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="sec-title font-bold text-white tracking-wide" style={{ ["--accent" as string]: "#a78bfa" }}>مهمات الشهر</h2>
        <span className="text-[11px] text-slate-400">الجمعة التالتة</span>
      </div>

      <div className="b-frame g-glow-gold p-4 text-center">
        <Image
          src={GFX.missionPrayer}
          alt=""
          width={128}
          height={128}
          priority
          aria-hidden="true"
          className="w-14 h-14 mx-auto object-contain"
        />
        <p className="font-bold text-white">القداس الشهري</p>
        <p className="text-xs text-slate-400 mt-1">
          تالت جمعة في الشهر — أكبر فرصة نقط في الشهر كله
        </p>
        <p className="font-bold text-[40px] leading-none text-amber-400 tabular-nums mt-2.5" dir="ltr">
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

      <section className="b-frame p-4">
        <h3 className="sec-title font-bold text-white text-sm mb-2.5" style={{ ["--accent" as string]: "#a78bfa" }}>
          📜 إزاي تاخد بونص القرايات؟
        </h3>
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
