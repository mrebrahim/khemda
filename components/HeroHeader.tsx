import Image from "next/image";
import Link from "next/link";
import CountUp from "@/components/CountUp";
import SoundToggle from "@/components/SoundToggle";
import MusicToggle from "@/components/MusicToggle";
import TutorialButton from "@/components/TutorialButton";
import HeroAvatar from "@/components/board/HeroAvatar";
import { logoutAction } from "@/app/hero/actions";
import { GFX } from "@/lib/assets";
import { tierColor } from "@/lib/board";
import type { HeroState } from "@/lib/hero-data";

export default function HeroHeader({ state }: { state: HeroState }) {
  const { hero, totalXp, rank, streak, atRisk } = state;
  const color = tierColor(rank.current?.tier);
  const level = rank.current?.level ?? 1;

  return (
    <header className="hero-hdr px-4 pt-4 pb-5">
      <div className="max-w-md mx-auto">
        {/* السطر العلوي */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative shrink-0">
              <HeroAvatar seed={hero.studentId} size={52} color={color} priority />
              {level >= 6 && (
                <Image
                  src={GFX.crownGoldSm}
                  alt=""
                  width={96}
                  height={96}
                  aria-hidden="true"
                  className="b-crown absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 object-contain"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] tracking-[0.3em] text-amber-400 font-bold">
                أهلاً يا بطل
              </span>
              <span className="block font-bold text-[17px] text-white truncate leading-tight">
                {hero.nickname || hero.fullName}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {[hero.area, hero.stage].filter(Boolean).join(" • ")}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 [&_button]:px-2 [&_button]:py-1 [&_a]:px-2 [&_a]:py-1">
            <TutorialButton />
            <MusicToggle compact />
            <SoundToggle />
            <Link
              href="/hero/card"
              aria-label="كارت البطل"
              data-tut="card"
              className="text-xs bg-white/10 border border-white/15 hover:bg-white/20 transition"
            >
              🎫
            </Link>
            <form action={logoutAction}>
              <button className="text-[10px] bg-white/10 border border-white/15 hover:bg-white/20 transition">
                خروج
              </button>
            </form>
          </div>
        </div>

        {/* النقط والسلسلة */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <div
            data-tut="xp"
            className="g-tile p-3 text-center"
            style={{ ["--tint" as string]: "rgba(242,169,0,.55)" }}
          >
            <p className="text-[26px] font-bold tabular-nums text-amber-400 flex items-center justify-center gap-1.5 leading-none">
              <Image
                src={GFX.xpGold}
                alt=""
                width={96}
                height={96}
                priority
                aria-hidden="true"
                className="w-7 h-7 object-contain"
              />
              <CountUp to={totalXp} />
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">نقطة</p>
          </div>

          <div
            data-tut="streak"
            className="g-tile p-3 text-center"
            style={{
              ["--tint" as string]: atRisk
                ? "rgba(239,68,68,.65)"
                : "rgba(34,211,238,.45)",
            }}
          >
            <p className="text-[26px] font-bold tabular-nums text-white leading-none">
              🔥 <CountUp to={streak.current_streak} duration={700} />
            </p>
            <p
              className={`text-[11px] mt-1.5 font-bold ${
                atRisk ? "text-red-300" : "text-slate-400"
              }`}
            >
              {atRisk ? "سلسلتك في خطر!" : "يوم ورا التاني"}
            </p>
          </div>
        </div>

        {/* المستوى */}
        <div
          data-tut="level"
          className="g-tile p-3 mt-2"
          style={{ ["--tint" as string]: `${color}88` }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className="inline-flex items-baseline gap-1 px-2 py-1 font-bold leading-none"
              dir="ltr"
              style={{ color, border: `1px solid ${color}66`, background: `${color}1a` }}
            >
              <span className="text-[9px] tracking-[0.18em] opacity-80">LEVEL</span>
              <span className="text-sm tabular-nums">
                {String(level).padStart(2, "0")}
              </span>
            </span>
            <span className="font-bold text-sm text-white truncate">
              {rank.current?.name ?? "—"}
            </span>
          </div>

          <span className="b-bar block h-2.5 bg-black/50 overflow-hidden" aria-hidden="true">
            <span style={{ width: `${rank.progress}%` }} />
          </span>

          <p className="text-[11px] text-slate-300 mt-1.5">
            {rank.next ? (
              <>
                فاضلك <b className="text-amber-400">{rank.toNext}</b> نقطة على{" "}
                <span dir="ltr">LEVEL {String(rank.next.level).padStart(2, "0")}</span>{" "}
                — {rank.next.name}
              </>
            ) : (
              "وصلت لأعلى مستوى 👑"
            )}
          </p>
        </div>
      </div>
    </header>
  );
}
