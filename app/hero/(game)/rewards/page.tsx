import { loadHero } from "@/lib/hero-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIZE } from "@/lib/prizes";
import Image from "next/image";
import ClaimButton from "@/components/ClaimButton";
import { GFX } from "@/lib/assets";

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
    <div className="space-y-3 pt-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="sec-title font-bold text-white tracking-wide">الجوايز</h2>
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
            className={`b-frame p-4 ${unlocked ? "" : "opacity-90"} ${
              isNext ? "g-glow-gold" : ""
            }`}
            style={{
              borderColor: unlocked
                ? "rgba(34,197,94,.55)"
                : isNext
                  ? "rgba(242,169,0,.6)"
                  : "rgba(255,255,255,.12)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="relative shrink-0">
                <span className={`block text-3xl ${unlocked ? "" : "grayscale opacity-70"}`}>
                  {prize.emoji}
                </span>
                {isNext && (
                  <Image
                    src={GFX.crownGoldSm}
                    alt=""
                    width={96}
                    height={96}
                    aria-hidden="true"
                    className="b-crown absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 object-contain"
                  />
                )}
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
              <div className="mt-2.5">
                <span className="b-bar block h-1.5 bg-black/50 overflow-hidden">
                  <span
                    style={{
                      width: `${Math.min(100, Math.round((totalXp / r.xp_required) * 100))}%`,
                    }}
                  />
                </span>
                <p className="text-xs text-slate-300 mt-1.5">
                  فاضلك <b className="text-amber-400">{r.xp_required - totalXp}</b> نقطة
                  {isNext && <span className="text-amber-300 font-bold"> — قرّبت يا وحش! 🔥</span>}
                </p>
              </div>
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
