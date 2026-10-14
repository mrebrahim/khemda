import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { STAGES, AREAS } from "@/lib/types";
import BoardFilters from "@/components/BoardFilters";

export const dynamic = "force-dynamic";

// صفحة عامة بس مش بتتفهرس في محركات البحث — أسامي أطفال
export const metadata: Metadata = {
  title: "لوحة الأبطال",
  robots: { index: false, follow: false, nocache: true },
};

type Row = {
  id: number;
  display_name: string;
  area: string | null;
  stage: string | null;
  verified_xp: number;
  total_xp: number;
  rank_name: string | null;
  rank_tier: string | null;
  rank_level: number | null;
};

/** لون كل رتبة — بيستخدم في حرف الكارت وفي شارة الرتبة */
const TIER_COLOR: Record<string, string> = {
  bronze: "#d97706",
  silver: "#cbd5e1",
  gold: "#f2a900",
  platinum: "#22d3ee",
  legendary: "#a78bfa",
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;

  // الصفحة مفتوحة للزائر، فبتقرا من views فيها الأعمدة الآمنة بس
  const supabase = await createClient();
  const [{ data: season }, { data: rows }] = await Promise.all([
    supabase.from("board_season").select("name").maybeSingle(),
    supabase
      .from("board_leaderboard")
      .select("id, display_name, area, stage, verified_xp, total_xp, rank_name, rank_tier, rank_level")
      .order("verified_xp", { ascending: false })
      .order("total_xp", { ascending: false }),
  ]);

  const all = (rows ?? []) as Row[];
  const filtered = all.filter(
    (s) => (!stage || s.stage === stage) && (!area || s.area === area),
  );
  const [first, second, third, ...rest] = filtered;

  return (
    <main className="g-bg min-h-screen text-white pb-14">
      <header className="px-4 pt-9 pb-6 text-center">
        <p className="text-[11px] tracking-[0.35em] text-amber-400/90 font-bold">
          أبطال المهمة
        </p>
        <h1 className="g-title font-bold text-3xl sm:text-4xl mt-1.5">
          لوحة الأبطال
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="g-live w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <p className="text-slate-300 text-sm">{season?.name ?? "—"}</p>
        </div>
        <div className="mx-auto mt-4 h-px w-40 bg-linear-to-l from-transparent via-amber-500/70 to-transparent" />
      </header>

      <div className="max-w-3xl mx-auto px-3">
        <BoardFilters stage={stage} area={area} stages={[...STAGES]} areas={[...AREAS]} />

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-20">لسه مفيش نقط مسجّلة</p>
        ) : (
          <>
            {/* المنصة */}
            <section className="grid grid-cols-3 gap-2 items-end mt-6 mb-7">
              <Podium person={second} place={2} />
              <Podium person={first} place={1} />
              <Podium person={third} place={3} />
            </section>

            <ol className="space-y-2">
              {rest.map((s, i) => {
                const color = TIER_COLOR[s.rank_tier ?? "bronze"] ?? "#f2a900";
                return (
                  <li
                    key={s.id}
                    className="g-card g-edge flex items-center gap-3 px-3 py-3"
                    style={{ ["--edge" as string]: color }}
                  >
                    <span className="g-rank w-9 h-10 shrink-0 grid place-content-center bg-white/10 font-bold text-white tabular-nums text-sm">
                      {i + 4}
                    </span>

                    <div className="grow min-w-0">
                      <p className="font-bold text-white text-base leading-tight truncate">
                        {s.display_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[s.area, s.stage].filter(Boolean).join(" • ")}
                      </p>
                    </div>

                    <LevelBadge level={s.rank_level} color={color} />

                    <span className="shrink-0 text-left w-16">
                      <span className="block font-bold text-xl text-amber-400 tabular-nums leading-none">
                        {s.verified_xp}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        نقطة
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="text-center text-slate-400 text-xs mt-7 leading-relaxed">
              الترتيب على النقط الموثقة من الحضور والمسابقات.
              <br />
              مهمات الصلاة والكتاب ليها نقطها بس مش داخلة في الترتيب ده.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

/** شارة المستوى — أرقام لاتينية زي شاشات الألعاب */
function LevelBadge({ level, color }: { level: number | null; color: string }) {
  if (!level) return null;
  return (
    <span
      className="inline-flex items-baseline gap-1 px-2 py-1 shrink-0 font-bold leading-none"
      dir="ltr"
      style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
    >
      <span className="text-[9px] tracking-[0.18em] opacity-80">LEVEL</span>
      <span className="text-sm tabular-nums">{String(level).padStart(2, "0")}</span>
    </span>
  );
}

function Podium({ person, place }: { person?: Row; place: 1 | 2 | 3 }) {
  if (!person) return <div />;

  const style = {
    1: { medal: "🥇", glow: "g-glow-gold", bar: "h-28", color: "#f2a900", label: "البطل" },
    2: { medal: "🥈", glow: "g-glow-silver", bar: "h-20", color: "#cbd5e1", label: "التاني" },
    3: { medal: "🥉", glow: "g-glow-bronze", bar: "h-16", color: "#d97706", label: "التالت" },
  }[place];

  return (
    <div className="text-center">
      <p className={place === 1 ? "text-4xl" : "text-3xl"}>{style.medal}</p>

      <p
        className={`font-bold text-white leading-tight truncate px-0.5 mt-1 ${
          place === 1 ? "text-base" : "text-sm"
        }`}
        title={person.display_name}
      >
        {person.display_name}
      </p>
      <p className="text-[10px] text-slate-400 truncate px-0.5 mb-1.5">
        {[person.area, person.stage].filter(Boolean).join(" • ")}
      </p>
      <div className="flex justify-center mb-2">
        <LevelBadge level={person.rank_level} color={style.color} />
      </div>

      <div
        className={`g-card ${style.glow} ${style.bar} grid place-content-center`}
        style={{ borderColor: `${style.color}66` }}
      >
        <span
          className="font-bold text-2xl tabular-nums leading-none"
          style={{ color: style.color }}
        >
          {person.verified_xp}
        </span>
        <span className="text-[10px] text-slate-400 mt-1">{style.label}</span>
      </div>
    </div>
  );
}
