import { loadHero } from "@/lib/hero-data";
import Image from "next/image";
import RuleList from "@/components/RuleList";
import { GFX } from "@/lib/assets";

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
    <div className="space-y-3 pt-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="sec-title font-bold text-white tracking-wide">تحديات الأسبوع</h2>
        <span className="text-[11px] text-slate-400">الخادم بيسجّلها</span>
      </div>

      <div className="b-frame g-glow-gold p-4 text-center">
        <Image
          src={GFX.missionTeam}
          alt=""
          width={128}
          height={128}
          priority
          aria-hidden="true"
          className="w-12 h-12 mx-auto object-contain"
        />
        <p className="text-xs text-slate-300 mt-1.5">لو حضرت كل حاجة يوم الجمعة</p>
        <p className="font-bold text-[44px] leading-none text-amber-400 tabular-nums mt-1.5" dir="ltr">
          +{fridayMax}
        </p>
        <p className="text-[11px] text-slate-400 mt-1.5">نقطة في يوم واحد 🔥</p>
        <p className="text-[13px] font-bold text-amber-200 mt-2">
          ده أكبر كنز نقط في الأسبوع — متفوّتهوش!
        </p>
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
