import { loadHero } from "@/lib/hero-data";
import Image from "next/image";
import MissionCard from "@/components/MissionCard";
import { GFX } from "@/lib/assets";
import WeekStrip from "@/components/WeekStrip";
import ReminderCard from "@/components/ReminderCard";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const state = await loadHero();
  if (!state) return null;

  const { rules, doneToday, streak, atRisk, week, prefs, window: win } = state;
  const xpOf = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;
  const bothDone = doneToday.size >= prefs.daily_goal;

  const prayerDone = doneToday.has("prayer");
  const bibleDone = doneToday.has("bible");

  // كل مهمة ليها حالة: مقفولة / مفتوحة / خلصت — والعدّاد بيتغيّر معاها
  function timerFor(done: boolean, locked: boolean) {
    if (done) {
      return { seconds: win.secondsToNextOpen, label: "تفتح تاني بعد" };
    }
    if (locked && !win.open) {
      return { seconds: win.secondsToOpen, label: "تفتح بعد" };
    }
    return { seconds: win.secondsToClose, label: "فاضل" };
  }

  const prayerTimer = timerFor(prayerDone, !win.open);
  const bibleLocked = !win.open || !prayerDone;
  const bibleTimer = timerFor(bibleDone, bibleLocked);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">☀️ مهمات النهارده</h2>
        <span className="text-[11px] text-slate-400">بتسجّلها بنفسك</span>
      </div>

      {!win.open && (
        <div className="b-frame p-3.5 text-center">
          <p className="font-bold text-white">🌙 المهمات لسه مقفولة</p>
          <p className="text-xs text-slate-400 mt-1">
            بتفتح كل يوم الساعة ٧ بالليل ولحد نص الليل
          </p>
        </div>
      )}

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
        icon={GFX.missionPrayer}
        title="مهمة الصلاة اليومية"
        detail="أبانا الذي • صلاة الشكر • مزمور ٥٠"
        xp={xpOf("prayer")}
        done={prayerDone}
        locked={!win.open}
        lockReason="بتفتح ٧ بالليل"
        seconds={prayerTimer.seconds}
        timerLabel={prayerTimer.label}
      />

      <MissionCard
        code="bible"
        emoji="📖"
        icon={GFX.missionBible}
        title="رحلة الكتاب المقدس"
        detail="اقرا إصحاح واحد على الأقل"
        xp={xpOf("bible")}
        done={bibleDone}
        locked={bibleLocked}
        lockReason={
          !win.open ? "بتفتح ٧ بالليل" : "تفتح لما تخلّص مهمة الصلاة"
        }
        seconds={bibleTimer.seconds}
        timerLabel={bibleTimer.label}
      />

      {bothDone && (
        <p className="text-center text-emerald-400 font-bold py-3">
          ✨ خلّصت مهمات النهارده! نشوفك بكره 🔥
        </p>
      )}

      <WeekStrip week={week} goal={prefs.daily_goal} />

      <ReminderCard prefs={prefs} />

      {/* مكافآت السلسلة */}
      <section className="g-card p-4">
        <h3 className="font-bold text-white text-sm mb-2.5 flex items-center gap-2">
          <Image
            src={GFX.missionAchievement}
            alt=""
            width={128}
            height={128}
            aria-hidden="true"
            className="w-6 h-6 object-contain"
          />
          مكافآت السلسلة
        </h3>
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
