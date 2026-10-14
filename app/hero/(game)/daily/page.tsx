import { loadHero } from "@/lib/hero-data";
import MissionCard from "@/components/MissionCard";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const state = await loadHero();
  if (!state) return null;

  const { rules, doneToday, streak, atRisk } = state;
  const xpOf = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;
  const bothDone = doneToday.has("prayer") && doneToday.has("bible");

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">☀️ مهمات النهارده</h2>
        <span className="text-[11px] text-slate-400">بتسجّلها بنفسك</span>
      </div>

      {atRisk && !bothDone && (
        <div className="g-card g-glow-bronze p-3.5 text-center">
          <p className="font-bold text-amber-300">
            🔥 سلسلتك {streak.current_streak} يوم — متسبهاش تقطع!
          </p>
          <p className="text-xs text-slate-400 mt-1">
            مهمة واحدة النهارده وتفضل مكمّلة
          </p>
        </div>
      )}

      <MissionCard
        code="prayer"
        emoji="🙏"
        title="مهمة الصلاة اليومية"
        detail="أبانا الذي • صلاة الشكر • مزمور ٥٠"
        xp={xpOf("prayer")}
        done={doneToday.has("prayer")}
      />

      <MissionCard
        code="bible"
        emoji="📖"
        title="رحلة الكتاب المقدس"
        detail="اقرا إصحاح واحد على الأقل"
        xp={xpOf("bible")}
        done={doneToday.has("bible")}
      />

      {bothDone && (
        <p className="text-center text-emerald-400 font-bold py-3">
          ✨ خلّصت مهمات النهارده! نشوفك بكره 🔥
        </p>
      )}

      {/* مكافآت السلسلة */}
      <section className="g-card p-4">
        <h3 className="font-bold text-white text-sm mb-2.5">🏆 مكافآت السلسلة</h3>
        <ul className="space-y-1.5">
          {[
            { d: 3, xp: 5 },
            { d: 7, xp: 15 },
            { d: 14, xp: 30 },
            { d: 30, xp: 60 },
            { d: 60, xp: 100 },
          ].map((m) => {
            const reached = streak.longest_streak >= m.d;
            return (
              <li
                key={m.d}
                className="flex items-center gap-2.5 text-sm py-1 border-b border-white/5 last:border-0"
              >
                <span className="text-base">{reached ? "✅" : "🔒"}</span>
                <span className={`grow ${reached ? "text-emerald-400" : "text-slate-300"}`}>
                  {m.d} يوم ورا بعض
                </span>
                <span className="font-bold text-amber-400 tabular-nums" dir="ltr">
                  +{m.xp}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-slate-500 mt-2.5">
          المكافأة بتتاخد مرة واحدة لما توصل للرقم ده في الموسم.
        </p>
      </section>
    </div>
  );
}
