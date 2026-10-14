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
};

const TIER: Record<string, string> = {
  bronze: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  silver: "bg-slate-400/20 border-slate-400/40 text-slate-200",
  gold: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
  platinum: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
  legendary: "bg-violet-500/20 border-violet-500/40 text-violet-300",
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;

  // الصفحة دي مفتوحة للزائر، فبتقرا من views مخصّصة فيها
  // الأعمدة الآمنة بس — مش من جداول المخدومين مباشرة
  const supabase = await createClient();

  const [{ data: season }, { data: rows }] = await Promise.all([
    supabase.from("board_season").select("name").maybeSingle(),
    supabase
      .from("board_leaderboard")
      .select("id, display_name, area, stage, verified_xp, total_xp, rank_name, rank_tier")
      .order("verified_xp", { ascending: false })
      .order("total_xp", { ascending: false }),
  ]);

  const all = (rows ?? []) as Row[];
  const filtered = all.filter(
    (s) => (!stage || s.stage === stage) && (!area || s.area === area),
  );
  const [first, second, third, ...rest] = filtered;

  return (
    <main className="min-h-screen bg-linear-to-b from-brand-950 via-slate-900 to-slate-950 text-white pb-12">
      <header className="px-4 pt-8 pb-5 text-center">
        <p className="text-4xl mb-1">🏆</p>
        <h1 className="font-bold text-2xl sm:text-3xl">لوحة الأبطال</h1>
        <p className="text-white/50 text-sm mt-1">{season?.name ?? "—"}</p>
      </header>

      <div className="max-w-3xl mx-auto px-3">
        <BoardFilters stage={stage} area={area} stages={[...STAGES]} areas={[...AREAS]} />

        {filtered.length === 0 ? (
          <p className="text-center text-white/40 py-16">لسه مفيش نقط مسجّلة</p>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-2 items-end mt-5 mb-6">
              <Podium person={second} place={2} height="h-24" />
              <Podium person={first} place={1} height="h-32" />
              <Podium person={third} place={3} height="h-20" />
            </section>

            <ol className="space-y-1.5">
              {rest.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                >
                  <span className="w-7 text-center text-white/40 font-bold tabular-nums shrink-0">
                    {i + 4}
                  </span>
                  <div className="grow min-w-0">
                    <p className="font-bold truncate">{s.display_name}</p>
                    <p className="text-[11px] text-white/40">
                      {[s.area, s.stage].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                  {s.rank_name && (
                    <span
                      className={`hidden sm:inline text-[11px] font-bold rounded-full px-2 py-0.5 border shrink-0 ${
                        TIER[s.rank_tier ?? "bronze"]
                      }`}
                    >
                      {s.rank_name}
                    </span>
                  )}
                  <span className="font-bold tabular-nums shrink-0 w-12 text-left">
                    {s.verified_xp}
                  </span>
                </li>
              ))}
            </ol>

            <p className="text-center text-white/30 text-xs mt-6 leading-relaxed">
              الترتيب على النقط الموثقة من الحضور والمسابقات.
              <br />
              المهمات الشخصية (الصلاة والكتاب) ليها نقطها بس مش داخلة في الترتيب ده.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Podium({
  person,
  place,
  height,
}: {
  person?: Row;
  place: 1 | 2 | 3;
  height: string;
}) {
  if (!person) return <div />;

  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const bar =
    place === 1
      ? "bg-linear-to-b from-yellow-400 to-yellow-600"
      : place === 2
        ? "bg-linear-to-b from-slate-300 to-slate-500"
        : "bg-linear-to-b from-amber-600 to-amber-800";

  return (
    <div className="text-center">
      <p className="text-3xl mb-1">{medal}</p>
      <p className="font-bold text-sm leading-tight truncate px-1">
        {person.display_name}
      </p>
      <p className="text-[10px] text-white/40 mb-1.5 truncate px-1">
        {[person.area, person.stage].filter(Boolean).join(" — ")}
      </p>
      <div
        className={`${height} ${bar} rounded-t-xl grid place-content-center font-bold text-slate-900`}
      >
        <span className="text-xl tabular-nums">{person.verified_xp}</span>
      </div>
    </div>
  );
}
