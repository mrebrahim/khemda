import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentHero, isConfigured } from "@/lib/student-auth";
import { getRanks, rankFor, getActiveSeason, getRules } from "@/lib/xp";
import { getStreak, streakAtRisk } from "@/lib/streak";
import { todayISO } from "@/lib/types";
import MissionCard from "@/components/MissionCard";
import PushPrompt from "@/components/PushPrompt";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HeroHome() {
  if (!isConfigured()) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-slate-900 text-white text-center">
        <div>
          <p className="text-4xl mb-3">⚙️</p>
          <p className="font-bold">النظام لسه مش متظبّط</p>
          <p className="text-sm text-white/60 mt-2">
            المشرف لازم يضيف STUDENT_SESSION_SECRET في إعدادات Vercel
          </p>
        </div>
      </main>
    );
  }

  const hero = await currentHero();
  if (!hero) redirect("/hero/login");

  const today = todayISO();
  const supabase = await createClient();

  const [season, ranks, rules, streak, { data: doneToday }] = await Promise.all([
    getActiveSeason(),
    getRanks(),
    getRules(),
    getStreak(hero.studentId),
    supabase
      .from("daily_missions")
      .select("rule_code")
      .eq("student_id", hero.studentId)
      .eq("on_date", today),
  ]);

  const { data: xpRows } = season
    ? await supabase
        .from("xp_ledger")
        .select("xp, is_verified")
        .eq("student_id", hero.studentId)
        .eq("season_id", season.id)
    : { data: [] };

  const totalXp = (xpRows ?? []).reduce((n, r) => n + r.xp, 0);
  const rank = rankFor(totalXp, ranks);
  const done = new Set((doneToday ?? []).map((d) => d.rule_code));
  const xpOf = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;

  const atRisk = streakAtRisk(streak, today);
  const bothDone = done.has("prayer") && done.has("bible");

  return (
    <main className="min-h-screen bg-slate-900 pb-10">
      {/* الهيدر */}
      <header className="bg-linear-to-b from-brand-800 to-brand-900 text-white px-4 pt-5 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/60">أهلاً يا بطل</p>
              <h1 className="font-bold text-xl truncate">
                {hero.nickname || hero.fullName}
              </h1>
              <p className="text-[11px] text-white/50">
                {[hero.area, hero.stage].filter(Boolean).join(" — ")}
              </p>
            </div>
            <form action={logoutAction}>
              <button className="text-[11px] bg-white/15 rounded-lg px-2.5 py-1.5 hover:bg-white/25 transition">
                خروج
              </button>
            </form>
          </div>

          {/* السلسلة والنقاط */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div
              className={`rounded-2xl p-3 text-center ${
                atRisk ? "bg-orange-500/25 ring-2 ring-orange-400" : "bg-white/10"
              }`}
            >
              <p className="text-2xl font-bold tabular-nums">
                🔥 {streak.current_streak}
              </p>
              <p className="text-[11px] text-white/70">
                {atRisk ? "سلسلتك في خطر!" : "يوم ورا التاني"}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{totalXp}</p>
              <p className="text-[11px] text-white/70">نقطة</p>
            </div>
          </div>

          {/* الرتبة */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-bold">{rank.current?.name ?? "—"}</span>
              <span className="text-white/60">
                {rank.next ? `${rank.next.name} بعد ${rank.toNext}` : "أعلى رتبة 👑"}
              </span>
            </div>
            <span className="block h-2.5 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${rank.progress}%` }}
              />
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 -mt-3 space-y-3">
        {atRisk && !bothDone && (
          <div className="bg-orange-100 border-2 border-orange-400 rounded-2xl p-3.5 text-center">
            <p className="font-bold text-orange-900">
              🔥 سلسلتك {streak.current_streak} يوم — متسبهاش تقطع!
            </p>
            <p className="text-xs text-orange-800 mt-1">
              خلّص مهمة واحدة النهارده وهتفضل مكمّلة
            </p>
          </div>
        )}

        <section className="space-y-2.5">
          <h2 className="font-bold text-white px-1">مهمات النهارده</h2>

          <MissionCard
            code="prayer"
            emoji="🙏"
            title="مهمة الصلاة اليومية"
            detail="أبانا الذي • صلاة الشكر • مزمور ٥٠"
            xp={xpOf("prayer")}
            done={done.has("prayer")}
          />

          <MissionCard
            code="bible"
            emoji="📖"
            title="رحلة الكتاب المقدس"
            detail="اقرا إصحاح واحد على الأقل"
            xp={xpOf("bible")}
            done={done.has("bible")}
          />

          {bothDone && (
            <p className="text-center text-green-400 font-bold py-2">
              ✨ خلّصت مهمات النهارده كلها! نشوفك بكره 🔥
            </p>
          )}
        </section>

        <PushPrompt />

        <section className="bg-white/5 rounded-2xl p-4 text-white/80">
          <h2 className="font-bold text-white mb-2 text-sm">أطول سلسلة ليك</h2>
          <p className="text-3xl font-bold tabular-nums">
            {streak.longest_streak} <span className="text-base font-normal">يوم</span>
          </p>
          {streak.freezes_available > 0 && (
            <p className="text-xs mt-2">
              ❄️ معاك {streak.freezes_available} تجميدة — لو فاتك يوم، سلسلتك
              مش هتقطع
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
