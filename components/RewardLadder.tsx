import type { Rank } from "@/lib/xp";

/** الهدايا الحقيقية من الـPRD — مربوطة برقم المستوى */
const PRIZE: Record<number, { emoji: string; label: string; big?: boolean }> = {
  3: { emoji: "🎟️", label: "ستيكر أو كارت مميز" },
  4: { emoji: "🏅", label: "كارت إنجاز" },
  5: { emoji: "🧢", label: "كاب أو ميدالية" },
  6: { emoji: "📚", label: "كتاب" },
  7: { emoji: "🎒", label: "إكسسوار" },
  8: { emoji: "👕", label: "تيشيرت الفريق" },
  9: { emoji: "🏐", label: "هدية رياضية" },
  10: { emoji: "⚽", label: "كرة قدم", big: true },
  11: { emoji: "🎧", label: "سماعات بلوتوث", big: true },
  12: { emoji: "⌚", label: "ساعة ذكية + كأس", big: true },
};

export default function RewardLadder({
  ranks,
  totalXp,
  currentLevel,
}: {
  ranks: Rank[];
  totalXp: number;
  currentLevel: number;
}) {
  const withPrizes = ranks
    .filter((r) => PRIZE[r.level])
    .sort((a, b) => a.level - b.level);

  const nextPrize = withPrizes.find((r) => r.level > currentLevel);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">🎁 الجوايز</h2>
        <span className="text-[11px] text-slate-400">اوصل للمستوى وخدها</span>
      </div>

      {/* الجايزة الجاية — دي اللي بتشد */}
      {nextPrize && (
        <div
          className="g-card g-glow-gold p-4 text-center"
          style={{ borderColor: "#f2a90066" }}
        >
          <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold">
            جايزتك الجاية
          </p>
          <p className="text-5xl my-2">{PRIZE[nextPrize.level].emoji}</p>
          <p className="font-bold text-white text-lg">
            {PRIZE[nextPrize.level].label}
          </p>
          <p className="text-sm text-amber-400 font-bold mt-1.5" dir="rtl">
            فاضلك {nextPrize.xp_required - totalXp} نقطة
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
            LEVEL {String(nextPrize.level).padStart(2, "0")} — {nextPrize.name}
          </p>
        </div>
      )}

      {/* السلّم كامل */}
      <ul className="space-y-1.5">
        {withPrizes.map((r) => {
          const prize = PRIZE[r.level];
          const unlocked = currentLevel >= r.level;
          const isNext = nextPrize?.level === r.level;

          return (
            <li
              key={r.level}
              className={`g-card g-edge flex items-center gap-3 px-3 py-2.5 ${
                unlocked ? "" : "opacity-70"
              }`}
              style={{
                ["--edge" as string]: unlocked
                  ? "#22c55e"
                  : isNext
                    ? "#f2a900"
                    : "#475569",
              }}
            >
              <span className={`text-2xl shrink-0 ${unlocked ? "" : "grayscale"}`}>
                {prize.emoji}
              </span>

              <div className="grow min-w-0">
                <p
                  className={`font-bold text-sm truncate ${
                    unlocked ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {prize.label}
                  {prize.big && !unlocked && (
                    <span className="text-amber-400 mr-1.5">★</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 tabular-nums" dir="ltr">
                  LEVEL {String(r.level).padStart(2, "0")} · {r.xp_required} XP
                </p>
              </div>

              <span className="shrink-0 text-lg">
                {unlocked ? "✅" : "🔒"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
        الجوايز بتتسلّم من المشرف بعد ما توصل للمستوى، وحسب توفرها.
      </p>
    </section>
  );
}
