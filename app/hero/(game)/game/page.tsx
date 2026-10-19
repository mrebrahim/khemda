import Link from "next/link";
import { loadHero } from "@/lib/hero-data";
import GamePlayer from "@/components/games/GamePlayer";
import { gameFor, nextGame } from "@/lib/games";
import { buildPuzzle } from "@/lib/games/build";
import { todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const state = await loadHero();
  if (!state) return null;

  const today = todayISO();
  const def = gameFor(today);
  const puzzle = buildPuzzle(def.key, today);
  const tomorrow = nextGame(today).game;

  const { rules, doneToday, window: win } = state;
  const xp = rules.find((r) => r.code === "game")?.xp ?? 2;

  const done = doneToday.has("game");
  const prayerDone = doneToday.has("prayer");
  const bibleDone = doneToday.has("bible");
  const locked = !done && (!win.open || !prayerDone || !bibleDone);

  const lockReason = !win.open
    ? "التحدي بيفتح كل يوم الساعة ٧ بالليل"
    : "خلّص مهمة الصلاة والإصحاح الأول، وتحدي النهارده يفتح";

  const timer = done
    ? { seconds: win.secondsToNextOpen, label: "تحدي بكرة بعد" }
    : locked && !win.open
      ? { seconds: win.secondsToOpen, label: "يفتح بعد" }
      : { seconds: win.secondsToClose, label: "فاضل" };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">🎮 تحدي النهارده</h2>
        <Link href="/hero/daily" className="text-[11px] text-amber-400 font-bold">
          ← باقي المهمات
        </Link>
      </div>

      <GamePlayer
        def={def}
        puzzle={puzzle}
        done={done}
        xp={xp}
        locked={locked}
        lockReason={lockReason}
        seconds={timer.seconds}
        timerLabel={timer.label}
        tomorrow={{ title: tomorrow.title, emoji: tomorrow.emoji }}
      />

      <div className="g-card p-3.5 text-center">
        <p className="text-[11px] text-slate-500">تحدي بكرة</p>
        <p className="font-bold text-white mt-0.5">
          {tomorrow.emoji} {tomorrow.title}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          اللعبة بتتغيّر كل يوم، والترتيب بيلف كل أسبوع — مفيش يومين زي بعض
        </p>
      </div>
    </div>
  );
}
