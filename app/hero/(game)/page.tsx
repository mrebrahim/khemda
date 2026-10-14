import Link from "next/link";
import { loadHero } from "@/lib/hero-data";
import PushPrompt from "@/components/PushPrompt";
import { PRIZE } from "@/lib/prizes";

export const dynamic = "force-dynamic";

export default async function HeroHome() {
  const state = await loadHero();
  if (!state) return null;

  const { rank, streak, totalXp, ranks, doneToday } = state;
  const level = rank.current?.level ?? 1;
  const nextPrize = ranks
    .filter((r) => PRIZE[r.level] && r.level > level)
    .sort((a, b) => a.level - b.level)[0];

  const todoCount = 2 - doneToday.size;

  return (
    <div className="space-y-3">
      {/* اللي لازم يعمله النهارده */}
      {todoCount > 0 ? (
        <Link
          href="/hero/daily"
          className="g-card g-edge block p-4"
          style={{ ["--edge" as string]: "#f2a900" }}
        >
          <p className="font-bold text-white">
            ☀️ فاضلك {todoCount === 2 ? "مهمتين" : "مهمة"} النهارده
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {state.atRisk
              ? `سلسلتك ${streak.current_streak} يوم — متسبهاش تقطع!`
              : "دقيقة واحدة وتكسب نقطك"}
          </p>
          <p className="text-xs text-amber-400 font-bold mt-2">يلا نخلّصها ←</p>
        </Link>
      ) : (
        <div className="g-card g-edge p-4" style={{ ["--edge" as string]: "#22c55e" }}>
          <p className="font-bold text-emerald-400">
            ✨ خلّصت مهمات النهارده كلها!
          </p>
          <p className="text-xs text-slate-400 mt-1">نشوفك بكره عشان السلسلة تكمّل 🔥</p>
        </div>
      )}

      <PushPrompt />

      {/* الجايزة الجاية */}
      {nextPrize && (
        <Link href="/hero/rewards" className="g-card g-glow-gold block p-4 text-center">
          <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold">
            جايزتك الجاية
          </p>
          <p className="text-5xl my-2">{PRIZE[nextPrize.level].emoji}</p>
          <p className="font-bold text-white">{PRIZE[nextPrize.level].label}</p>
          <p className="text-sm text-amber-400 font-bold mt-1.5">
            فاضلك {nextPrize.xp_required - totalXp} نقطة
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
            LEVEL {String(nextPrize.level).padStart(2, "0")}
          </p>
        </Link>
      )}

      {/* السلسلة */}
      <section className="g-card p-4">
        <h2 className="font-bold text-white mb-2 text-sm">🔥 السلسلة</h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-3xl font-bold tabular-nums text-amber-400">
              {streak.current_streak}
            </p>
            <p className="text-[11px] text-slate-400">دلوقتي</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-white">
              {streak.longest_streak}
            </p>
            <p className="text-[11px] text-slate-400">أطول سلسلة</p>
          </div>
        </div>
        {streak.freezes_available > 0 && (
          <p className="text-xs text-slate-400 mt-3 text-center">
            ❄️ معاك {streak.freezes_available} تجميدة — لو فاتك يوم سلسلتك مش هتقطع
          </p>
        )}
      </section>

      <Link
        href="/board"
        className="g-card block p-3.5 text-center font-bold text-white hover:brightness-125 transition"
      >
        🏆 شوف ترتيبك بين كل الأبطال
      </Link>
    </div>
  );
}
