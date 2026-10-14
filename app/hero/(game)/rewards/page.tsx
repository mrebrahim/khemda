import { loadHero } from "@/lib/hero-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIZE } from "@/lib/prizes";
import ClaimButton from "@/components/ClaimButton";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "طلبك عند المشرف ⏳", color: "#f2a900" },
  approved: { label: "اتوافق عليها — استلمها من المشرف ✅", color: "#22c55e" },
  delivered: { label: "استلمتها 🎉", color: "#22c55e" },
  rejected: { label: "الطلب اترفض — كلّم المشرف", color: "#ef4444" },
};

export default async function RewardsPage() {
  const state = await loadHero();
  if (!state) return null;

  const { ranks, totalXp, rank, seasonId, hero } = state;
  const level = rank.current?.level ?? 1;

  const supabase = await createAdminClient();
  const { data: claims } = seasonId
    ? await supabase
        .from("reward_claims")
        .select("level, status")
        .eq("student_id", hero.studentId)
        .eq("season_id", seasonId)
    : { data: [] };

  const claimOf = new Map((claims ?? []).map((c) => [c.level, c.status as string]));

  const list = ranks
    .filter((r) => PRIZE[r.level])
    .sort((a, b) => a.level - b.level);

  const unlockedUnclaimed = list.filter(
    (r) => level >= r.level && !claimOf.has(r.level),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">🎁 الجوايز</h2>
        <span className="text-[11px] text-slate-400">
          {unlockedUnclaimed.length > 0
            ? `${unlockedUnclaimed.length} جاهزة للطلب!`
            : "اوصل للمستوى وخدها"}
        </span>
      </div>

      {list.map((r) => {
        const prize = PRIZE[r.level];
        const unlocked = level >= r.level;
        const status = claimOf.get(r.level);
        const isNext = !unlocked && r.xp_required > totalXp &&
          !list.some((x) => x.level < r.level && x.level > level);

        return (
          <div
            key={r.level}
            className={`g-card g-edge p-4 ${unlocked ? "" : "opacity-80"} ${
              isNext ? "g-glow-gold" : ""
            }`}
            style={{
              ["--edge" as string]: unlocked ? "#22c55e" : isNext ? "#f2a900" : "#475569",
            }}
          >
            <div className="flex items-center gap-3">
              <span className={`text-3xl shrink-0 ${unlocked ? "" : "grayscale"}`}>
                {prize.emoji}
              </span>

              <div className="grow min-w-0">
                <p className="font-bold text-white">
                  {prize.label}
                  {prize.big && <span className="text-amber-400 mr-1.5">★</span>}
                </p>
                <p className="text-[11px] text-slate-400 tabular-nums" dir="ltr">
                  LEVEL {String(r.level).padStart(2, "0")} · {r.xp_required} XP
                </p>
              </div>

              <span className="shrink-0 text-xl">{unlocked ? "🔓" : "🔒"}</span>
            </div>

            {!unlocked && (
              <p className="text-xs text-slate-400 mt-2">
                فاضلك <b className="text-amber-400">{r.xp_required - totalXp}</b> نقطة
              </p>
            )}

            {unlocked && !status && <ClaimButton level={r.level} />}

            {status && (
              <p
                className="mt-3 py-2.5 text-center font-bold text-sm border"
                style={{
                  color: STATUS[status]?.color,
                  borderColor: `${STATUS[status]?.color}55`,
                  background: `${STATUS[status]?.color}14`,
                }}
              >
                {STATUS[status]?.label ?? status}
              </p>
            )}
          </div>
        );
      })}

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
        بعد ما تطلب الجايزة، المشرف بيراجع الطلب ويسلّمك. الجوايز حسب توفرها.
      </p>
    </div>
  );
}
