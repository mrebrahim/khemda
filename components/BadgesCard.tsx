import { nextBadge, TIER_STYLE, type EarnedBadge } from "@/lib/badges";

/**
 * الشارات.
 *
 * مش كل مستوى لازم يطلّع هدية حقيقية — الشارة بتدّي نفس
 * الإحساس وبتفضل مع الولد، وبتتفتح من اللي عمله فعلاً مش من
 * رقم نقطه.
 */
export default function BadgesCard({ badges }: { badges: EarnedBadge[] }) {
  const done = badges.filter((b) => b.done);
  const next = nextBadge(badges);

  return (
    <section className="b-frame p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="sec-title font-bold text-white text-sm">🎖️ شاراتك</h2>
        <span className="text-[11px] text-slate-400 tabular-nums">
          {done.length} من {badges.length}
        </span>
      </div>

      {done.length === 0 ? (
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          لسه ماخدتش شارة. أول واحدة قريبة 👇
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {done.map((b) => {
            const st = TIER_STYLE[b.tier];
            return (
              <div
                key={b.code}
                title={b.detail}
                className="g-tile p-2 text-center"
                style={{ ["--tint" as string]: st.ring }}
              >
                <p className="text-2xl leading-none" aria-hidden="true">
                  {b.emoji}
                </p>
                <p
                  className="text-[10px] font-bold mt-1.5 leading-tight"
                  style={{ color: st.text }}
                >
                  {b.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {next && (
        <div className="mt-3 border border-white/15 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl opacity-40 grayscale" aria-hidden="true">
              {next.emoji}
            </span>
            <span className="grow min-w-0">
              <span className="block text-sm font-bold text-white">{next.label}</span>
              <span className="block text-[11px] text-slate-400">{next.detail}</span>
            </span>
            <span className="shrink-0 text-xs font-bold text-amber-300 tabular-nums">
              {next.have}/{next.need}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (next.have / next.need) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
