import Image from "next/image";
import Link from "next/link";
import { loadHero } from "@/lib/hero-data";
import WeekStrip from "@/components/WeekStrip";
import MissionTimer from "@/components/MissionTimer";
import { PRIZE } from "@/lib/prizes";
import { GFX } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function HeroHome() {
  const state = await loadHero();
  if (!state) return null;

  const { rank, streak, totalXp, ranks, doneToday, rules, week, prefs, hour, window: win } = state;
  const level = rank.current?.level ?? 1;
  const nextPrize = ranks
    .filter((r) => PRIZE[r.level] && r.level > level)
    .sort((a, b) => a.level - b.level)[0];

  const done = doneToday.size;
  const goal = prefs.daily_goal;
  const todoCount = Math.max(0, goal - done);
  // بعد ٩ بالليل والسلسلة على وشك تقطع = وقت التحذير
  const lastChance = state.atRisk && todoCount > 0 && hour >= 21 && win.open;
  const xpOf = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;
  const todayXp = xpOf("prayer") + xpOf("bible");

  // أكبر يوم في الأسبوع — عشان يعرف إن الجمعة هي الكنز
  const fridayMax = rules
    .filter((r) => r.category === "friday" && r.is_active && !/_(1st|2nd|3rd)$/.test(r.code))
    .reduce((n, r) => n + r.xp, 0);

  return (
    <div className="space-y-3 pt-3">
      {lastChance && (
        <div className="b-frame mission-live p-3.5 text-center" style={{ borderColor: "rgba(239,68,68,.7)" }}>
          <p className="font-bold text-red-300">
            🚨 آخر فرصة — سلسلتك {streak.current_streak} يوم هتضيع!
          </p>
          <p className="text-xs text-slate-300 mt-1">
            مهمة واحدة بس قبل نص الليل وتفضل مكمّلة
          </p>
        </div>
      )}

      {/* مهمة النهارده */}
      {todoCount > 0 && !win.open ? (
        <div
          data-tut="today"
          className="b-frame p-4 text-center"
          style={{ borderColor: "rgba(255,255,255,.15)" }}
        >
          <p className="text-3xl" aria-hidden="true">
            🔒
          </p>
          <p className="font-bold text-white mt-1">المهمات بتفتح ٧ بالليل</p>
          <p className="text-xs text-slate-400 mt-1">
            جهّز نفسك — أول ما تفتح تاخد نقطك
          </p>
          <div className="mt-2.5">
            <MissionTimer seconds={win.secondsToOpen} label="تفتح بعد" tone="slate" />
          </div>
        </div>
      ) : todoCount > 0 ? (
        <Link
          href="/hero/daily"
          data-tut="today"
          className="b-frame mission-live block p-4 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <Image
              src={GFX.missionPrayer}
              alt=""
              width={128}
              height={128}
              priority
              aria-hidden="true"
              className="w-12 h-12 object-contain shrink-0"
            />
            <div className="grow min-w-0">
              <p className="font-bold text-white text-[15px]">
                {todoCount >= 2
                  ? "مهمتين مستنيينك النهارده!"
                  : "فاضلك مهمة واحدة بس!"}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {state.atRisk
                  ? `سلسلتك ${streak.current_streak} يوم — متسبهاش تقطع! 🔥`
                  : `دقيقة واحدة وتكسب +${todoCount >= 2 ? todayXp : Math.max(xpOf("prayer"), xpOf("bible"))} نقطة`}
              </p>
            </div>
            <span className="shrink-0 text-amber-400 font-bold text-sm">يلا ←</span>
          </div>

          <div className="mt-2.5">
            <MissionTimer seconds={win.secondsToClose} label="فاضل" />
          </div>

          {/* تقدّم النهارده */}
          <div className="flex items-center gap-2 mt-3">
            <span className="b-bar block grow h-1.5 bg-black/50 overflow-hidden">
              <span style={{ width: `${Math.min(100, (done / goal) * 100)}%` }} />
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums" dir="ltr">
              {done}/{goal}
            </span>
          </div>
        </Link>
      ) : (
        <div
          data-tut="today"
          className="b-frame p-4 text-center"
          style={{ borderColor: "rgba(34,197,94,.55)" }}
        >
          <p className="text-3xl" aria-hidden="true">
            ✅
          </p>
          <p className="font-bold text-emerald-400 mt-1">
            خلّصت مهمات النهارده كلها!
          </p>
          <p className="text-xs text-slate-400 mt-1">
            نشوفك بكره عشان السلسلة تكمّل 🔥
          </p>
          <div className="mt-2.5">
            <MissionTimer
              seconds={win.secondsToNextOpen}
              label="مهمات بكره بتفتح بعد"
              tone="green"
            />
          </div>
        </div>
      )}

      <WeekStrip week={week} goal={goal} />

      {/* الجايزة الجاية */}
      {nextPrize && (
        <Link
          href="/hero/rewards"
          data-tut="prize"
          className="b-frame g-glow-gold block p-4 text-center relative overflow-hidden"
        >
          <Image
            src={GFX.crownGoldSm}
            alt=""
            width={96}
            height={96}
            aria-hidden="true"
            className="b-crown w-9 h-9 mx-auto object-contain"
          />
          <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold mt-1">
            جايزتك الجاية
          </p>
          <p className="text-5xl my-2">{PRIZE[nextPrize.level].emoji}</p>
          <p className="font-bold text-white text-lg">{PRIZE[nextPrize.level].label}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className="b-bar block grow h-2 bg-black/50 overflow-hidden">
              <span
                style={{
                  width: `${Math.min(100, Math.round((totalXp / nextPrize.xp_required) * 100))}%`,
                }}
              />
            </span>
            <span className="text-[11px] font-bold text-amber-400 shrink-0 tabular-nums">
              فاضلك {nextPrize.xp_required - totalXp}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1" dir="ltr">
            LEVEL {String(nextPrize.level).padStart(2, "0")}
          </p>
        </Link>
      )}

      {/* أكبر فرصة نقط في الأسبوع */}
      <Link
        href="/hero/weekly"
        className="b-frame block p-4"
        style={{ borderColor: "rgba(242,169,0,.35)" }}
      >
        <div className="flex items-center gap-3">
          <Image
            src={GFX.missionTeam}
            alt=""
            width={128}
            height={128}
            aria-hidden="true"
            className="w-11 h-11 object-contain shrink-0"
          />
          <div className="grow min-w-0">
            <p className="font-bold text-white text-sm">يوم الجمعة = كنز النقط</p>
            <p className="text-xs text-slate-400 mt-0.5">
              لو حضرت كل حاجة تاخد{" "}
              <b className="text-amber-400 tabular-nums">+{fridayMax}</b> في يوم واحد
            </p>
          </div>
          <span className="shrink-0 text-amber-400 font-bold text-sm">شوف ←</span>
        </div>
      </Link>

      {/* السلسلة */}
      <section className="b-frame p-4">
        <h2 className="sec-title font-bold text-white mb-3 text-sm">🔥 السلسلة</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="g-tile p-3 text-center" style={{ ["--tint" as string]: "rgba(242,169,0,.45)" }}>
            <p className="text-3xl font-bold tabular-nums text-amber-400 leading-none">
              {streak.current_streak}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">دلوقتي</p>
          </div>
          <div className="g-tile p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-white leading-none">
              {streak.longest_streak}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">أطول سلسلة</p>
          </div>
        </div>
        {streak.freezes_available > 0 && (
          <p className="text-xs text-cyan-300 mt-3 text-center">
            ❄️ معاك {streak.freezes_available} تجميدة — لو فاتك يوم سلسلتك مش هتقطع
          </p>
        )}
      </section>

      {/* الترتيب */}
      <Link
        href="/board"
        data-tut="board"
        className="b-frame b-row block p-3.5 relative overflow-hidden"
        style={{ ["--edge" as string]: "#f2a900" }}
      >
        <span className="flex items-center justify-center gap-2 font-bold text-white">
          <Image
            src={GFX.trophyGold}
            alt=""
            width={128}
            height={128}
            aria-hidden="true"
            className="w-8 h-8 object-contain"
          />
          شوف ترتيبك بين كل الأبطال
        </span>
      </Link>
    </div>
  );
}
