import Link from "next/link";
import CountUp from "@/components/CountUp";
import SoundToggle from "@/components/SoundToggle";
import TutorialButton from "@/components/TutorialButton";
import { logoutAction } from "@/app/hero/actions";
import type { HeroState } from "@/lib/hero-data";

export default function HeroHeader({ state }: { state: HeroState }) {
  const { hero, totalXp, rank, streak, atRisk } = state;

  return (
    <header className="px-4 pt-5 pb-5">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] text-amber-400 font-bold">
              أهلاً يا بطل
            </p>
            <h1 className="font-bold text-lg truncate">
              {hero.nickname || hero.fullName}
            </h1>
            <p className="text-[11px] text-slate-400">
              {[hero.area, hero.stage].filter(Boolean).join(" • ")}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <TutorialButton />
            <SoundToggle />
            <Link
              href="/hero/card"
              aria-label="كارت البطل"
              data-tut="card"
              className="text-sm bg-white/10 border border-white/15 px-2.5 py-1.5 hover:bg-white/20 transition"
            >
              🎫
            </Link>
            <form action={logoutAction}>
              <button className="text-[11px] bg-white/10 border border-white/15 px-2.5 py-1.5 hover:bg-white/20 transition">
                خروج
              </button>
            </form>
          </div>
        </div>

        {/* السلسلة والنقط */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div data-tut="streak" className={`g-card p-3 text-center ${atRisk ? "g-glow-bronze" : ""}`}>
            <p className="text-2xl font-bold tabular-nums">
              🔥 <CountUp to={streak.current_streak} duration={700} />
            </p>
            <p className="text-[11px] text-slate-400">
              {atRisk ? "سلسلتك في خطر!" : "يوم ورا التاني"}
            </p>
          </div>
          <div data-tut="xp" className="g-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-400">
              <CountUp to={totalXp} />
            </p>
            <p className="text-[11px] text-slate-400">نقطة</p>
          </div>
        </div>

        {/* المستوى */}
        <div data-tut="level" className="mt-2.5 g-card p-3">
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
              className="block h-full bg-linear-to-l from-amber-400 to-amber-500 transition-all duration-700"
              style={{ width: `${rank.progress}%` }}
            />
          </span>

          <p className="text-[11px] text-slate-400 mt-1.5">
            {rank.next
              ? `فاضل ${rank.toNext} نقطة على LEVEL ${rank.next.level} — ${rank.next.name}`
              : "وصلت لأعلى مستوى 👑"}
          </p>
        </div>
      </div>
    </header>
  );
}
