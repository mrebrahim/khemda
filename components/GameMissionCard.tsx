import Link from "next/link";
import Image from "next/image";
import { GFX } from "@/lib/assets";
import MissionTimer from "@/components/MissionTimer";

/**
 * كارت تحدي النهارده في كشف المهمات. اللعبة نفسها في صفحة لوحدها،
 * فده لينك مش زرار تسجيل.
 */
export default function GameMissionCard({
  title,
  emoji,
  xp,
  done,
  locked,
  lockReason,
  seconds,
  timerLabel,
}: {
  title: string;
  emoji: string;
  xp: number;
  done: boolean;
  locked: boolean;
  lockReason: string;
  seconds: number;
  timerLabel: string;
}) {
  return (
    <Link
      href="/hero/game"
      className={`b-frame block p-4 transition active:scale-[0.99] ${
        done || locked ? "" : "mission-live hover:brightness-110"
      } ${locked ? "opacity-75" : ""}`}
      style={{
        borderColor: done
          ? "rgba(34,197,94,.6)"
          : locked
            ? "rgba(255,255,255,.15)"
            : "rgba(242,169,0,.5)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl shrink-0">{done ? "✅" : locked ? "🔒" : emoji}</span>

        <div className="grow min-w-0">
          <p className={`font-bold text-[15px] ${done ? "text-emerald-400" : "text-white"}`}>
            تحدي النهارده
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {locked ? lockReason : done ? "كسبته النهارده 🎉" : title}
          </p>
        </div>

        <span
          className={`shrink-0 flex items-center gap-1 font-bold px-2 py-1 text-sm border ${
            done
              ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
              : "text-amber-400 border-amber-500/40 bg-amber-500/10"
          }`}
          dir="ltr"
        >
          <Image
            src={GFX.xpGold}
            alt=""
            width={96}
            height={96}
            aria-hidden="true"
            className="w-4 h-4 object-contain"
          />
          +{xp}
        </span>
      </div>

      <div className="mt-2.5">
        <MissionTimer
          seconds={seconds}
          label={timerLabel}
          tone={done ? "green" : locked ? "slate" : "amber"}
        />
      </div>

      {!done && !locked && (
        <p className="mt-3 text-center text-[13px] font-bold text-slate-950 bg-linear-to-l from-amber-500 to-amber-400 py-2">
          🎮 دوس عشان تلعب
        </p>
      )}
    </Link>
  );
}
