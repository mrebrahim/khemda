import { loadHero } from "@/lib/hero-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOP, prizeLabel } from "@/lib/prizes";
import ClaimButton from "@/components/ClaimButton";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "طلبك عند المشرف ⏳", color: "#f2a900" },
  approved: { label: "اتوافق عليها — استلمها من المشرف ✅", color: "#22c55e" },
  delivered: { label: "استلمتها 🎉", color: "#22c55e" },
  rejected: { label: "الطلب اترفض ونقطك رجعت", color: "#ef4444" },
};

export default async function RewardsPage() {
  const state = await loadHero();
  if (!state) return null;

  const { totalXp, seasonId, hero } = state;

  const supabase = await createAdminClient();
  const { data: claims } = seasonId
    ? await supabase
        .from("reward_claims")
        .select("level, status")
        .eq("student_id", hero.studentId)
        .eq("season_id", seasonId)
    : { data: [] };

  const claimOf = new Map((claims ?? []).map((c) => [c.level, c.status as string]));
  const canBuy = SHOP.filter((p) => p.cost <= totalXp && !claimOf.has(p.key));

  // طلبات قديمة من قبل المحل — بنعرضها عشان الولد يتابعها
  const legacy = (claims ?? []).filter((c) => !SHOP.some((p) => p.key === c.level));

  return (
    <div className="space-y-3 pt-3">
      {/* الرصيد */}
      <section className="b-frame p-4 text-center" style={{ borderColor: "rgba(242,169,0,.6)" }}>
        <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold">رصيدك</p>
        <p className="text-5xl font-bold text-amber-400 tabular-nums leading-none mt-1.5">
          {totalXp}
        </p>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          الهدية ليها سعر. لما تاخدها بيتخصم سعرها من رصيدك ومستواك بينزل
          معاه.
          <br />
          <span className="text-slate-500">
            يعني اختار: تاخد دلوقتي ولا تجمّع وتفضل في المقدمة؟
          </span>
        </p>
      </section>

      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="sec-title font-bold text-white tracking-wide">المحل</h2>
        <span className="text-[11px] text-slate-400">
          {canBuy.length > 0 ? `${canBuy.length} تقدر تاخدها دلوقتي` : "جمّع نقط الأول"}
        </span>
      </div>

      {SHOP.map((p) => {
        const status = claimOf.get(p.key);
        const afford = totalXp >= p.cost;
        const need = p.cost - totalXp;

        return (
          <div
            key={p.key}
            className="b-frame p-4"
            style={{
              borderColor: status
                ? "rgba(34,197,94,.5)"
                : afford
                  ? "rgba(242,169,0,.6)"
                  : "rgba(255,255,255,.12)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl shrink-0 leading-none ${afford || status ? "" : "opacity-40 grayscale"}`}
                aria-hidden="true"
              >
                {p.emoji}
              </span>
              <span className="grow min-w-0">
                <span className="block font-bold text-white">{p.label}</span>
                <span className="block text-sm font-bold text-amber-300 tabular-nums mt-0.5">
                  {p.cost} نقطة
                </span>
              </span>
              {p.big && (
                <span className="shrink-0 text-[10px] font-bold text-violet-300 border border-violet-500/50 px-2 py-1">
                  كبيرة
                </span>
              )}
            </div>

            {status ? (
              <p
                className="mt-3 text-center text-sm font-bold py-2 border"
                style={{ color: STATUS[status]?.color, borderColor: `${STATUS[status]?.color}55` }}
              >
                {STATUS[status]?.label ?? status}
              </p>
            ) : afford ? (
              <>
                <ClaimButton level={p.key} cost={p.cost} after={totalXp - p.cost} />
              </>
            ) : (
              <>
                <div className="h-1.5 bg-white/10 mt-3 overflow-hidden">
                  <div
                    className="h-full bg-amber-400/70 transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalXp / p.cost) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
                  فاضلك {need} نقطة
                </p>
              </>
            )}
          </div>
        );
      })}

      {legacy.length > 0 && (
        <section className="b-frame p-4">
          <h3 className="font-bold text-white text-sm">طلبات قديمة</h3>
          <ul className="mt-2 space-y-1.5">
            {legacy.map((c) => (
              <li key={c.level} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-300">{prizeLabel(c.level)}</span>
                <span
                  className="text-[11px] font-bold shrink-0"
                  style={{ color: STATUS[c.status]?.color ?? "#94a3b8" }}
                >
                  {STATUS[c.status]?.label ?? c.status}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            دي طلبات قبل ما المحل يشتغل — مفيش نقط اتخصمت منها.
          </p>
        </section>
      )}
    </div>
  );
}
