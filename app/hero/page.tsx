import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero, isConfigured } from "@/lib/student-auth";
import { hasServiceRole } from "@/lib/supabase/admin";
import { getRanks, rankFor, getActiveSeason, getRules } from "@/lib/xp";
import { getStreak, streakAtRisk } from "@/lib/streak";
import { todayISO } from "@/lib/types";
import MissionCard from "@/components/MissionCard";
import PushPrompt from "@/components/PushPrompt";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HeroHome() {
  const missing: string[] = [];
  if (!isConfigured()) missing.push("STUDENT_SESSION_SECRET");
  if (!hasServiceRole()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-slate-900 text-white text-center">
        <div>
          <p className="text-4xl mb-3">⚙️</p>
          <p className="font-bold">النظام لسه مش متظبّط</p>
          <p className="text-sm text-white/60 mt-2">
            المشرف لازم يضيف{" "}
            <span dir="ltr" className="font-mono text-xs">
              {missing.join(" + ")}
            </span>{" "}
            في إعدادات Vercel
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
    <main className="g-bg min-h-screen pb-10 text-white">
      {/* الهيدر */}
      <header className="px-4 pt-6 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.3em] text-amber-400 font-bold">أهلاً يا بطل</p>
              <h1 className="font-bold text-xl truncate">
                {hero.nickname || hero.fullName}
              </h1>
              <p className="text-[11px] text-slate-400">
                {[hero.area, hero.stage].filter(Boolean).join(" — ")}
              </p>
            </div>
            <form action={logoutAction}>
              <button className="text-[11px] bg-white/10 border border-white/15 px-2.5 py-1.5 hover:bg-white/20 transition">
                خروج
              </button>
            </form>
          </div>

          {/* السلسلة والنقاط */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div
              className={`g-card p-3 text-center ${
                atRisk ? "g-glow-bronze" : ""
              }`}
            >
              <p className="text-2xl font-bold tabular-nums">
                🔥 {streak.current_streak}
              </p>
              <p className="text-[11px] text-slate-400">
                {atRisk ? "سلسلتك في خطر!" : "يوم ورا التاني"}
              </p>
            </div>
            <div className="g-card p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-amber-400">{totalXp}</p>
              <p className="text-[11px] text-slate-400">نقطة</p>
            </div>
          </div>

          {/* الرتبة */}
          <div className="mt-4 g-card p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className="inline-flex items-baseline gap-1 px-2 py-1 font-bold leading-none text-amber-400 border border-amber-500/40 bg-amber-500/10"
                dir="ltr"
              >
                <span className="text-[9px] tracking-[0.18em] opacity-80">LEVEL</span>
                <span className="text-sm tabular-nums">
                  {String(rank.current?.level ?? 1).padStart(2, "0")}
                </span>
              </span>
              <span className="font-bold text-sm text-white truncate">
                {rank.current?.name ?? "—"}
              </span>
            </div>

            <span className="block h-2.5 bg-black/40 overflow-hidden" aria-hidden="true">
              <span
                className="block h-full bg-linear-to-l from-amber-400 to-amber-500 transition-all"
                style={{ width: `${rank.progress}%` }}
              />
            </span>

            <p className="text-[11px] text-slate-400 mt-1.5" dir="rtl">
              {rank.next
                ? `فاضل ${rank.toNext} نقطة على LEVEL ${rank.next.level} — ${rank.next.name}`
                : "وصلت لأعلى مستوى 👑"}
            </p>
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
          <h2 className="font-bold text-white px-1 tracking-wide">مهمات النهارده</h2>

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

        <section className="g-card p-4 text-slate-300">
          <h2 className="font-bold text-white mb-2 text-sm">أطول سلسلة ليك</h2>
          <p className="text-3xl font-bold tabular-nums text-amber-400">
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
