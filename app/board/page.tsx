import type { Metadata } from "next";
import { getLeaderboard, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { createClient } from "@/lib/supabase/server";
import { STAGES, AREAS } from "@/lib/types";
import BoardFilters from "@/components/BoardFilters";

export const dynamic = "force-dynamic";

// صفحة عامة بس مش بتتفهرس في محركات البحث — أسامي أطفال
export const metadata: Metadata = {
  title: "لوحة الأبطال",
  robots: { index: false, follow: false, nocache: true },
};

const TIER: Record<string, { bg: string; text: string }> = {
  bronze: { bg: "bg-amber-500/20 border-amber-500/40", text: "text-amber-300" },
  silver: { bg: "bg-slate-400/20 border-slate-400/40", text: "text-slate-200" },
  gold: { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-300" },
  platinum: { bg: "bg-cyan-500/20 border-cyan-500/40", text: "text-cyan-300" },
  legendary: { bg: "bg-violet-500/20 border-violet-500/40", text: "text-violet-300" },
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;
  const [season, ranks, board] = await Promise.all([
    getActiveSeason(),
    getRanks(),
    getLeaderboard(),
  ]);

  // الاسم المستعار لو الولد حطّه بيحل محل اسمه الحقيقي
  const supabase = await createClient();
  const { data: nicks } = await supabase
    .from("student_accounts")
    .select("student_id, nickname")
    .not("nickname", "is", null);
  const nickOf = new Map((nicks ?? []).map((n) => [n.student_id, n.nickname as string]));

  const filtered = board
    .filter((s) => (!stage || s.stage === stage) && (!area || s.area === area))
    .filter((s) => s.verified_xp > 0);

  const [first, second, third, ...rest] = filtered;

  if (!season) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-white/60">
        مفيش موسم نشط دلوقتي
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-brand-950 via-slate-900 to-slate-950 text-white pb-12">
      <header className="px-4 pt-8 pb-5 text-center">
        <p className="text-4xl mb-1">🏆</p>
        <h1 className="font-bold text-2xl sm:text-3xl">لوحة الأبطال</h1>
        <p className="text-white/50 text-sm mt-1">{season.name}</p>
      </header>

      <div className="max-w-3xl mx-auto px-3">
        <BoardFilters stage={stage} area={area} stages={[...STAGES]} areas={[...AREAS]} />

        {filtered.length === 0 ? (
          <p className="text-center text-white/40 py-16">
            لسه مفيش نقط مسجّلة
          </p>
        ) : (
          <>
            {/* المنصة */}
            <section className="grid grid-cols-3 gap-2 items-end mt-5 mb-6">
              <Podium person={second} nickOf={nickOf} place={2} height="h-24" />
              <Podium person={first} nickOf={nickOf} place={1} height="h-32" />
              <Podium person={third} nickOf={nickOf} place={3} height="h-20" />
            </section>

            {/* الباقي */}
            <ol className="space-y-1.5">
              {rest.map((s, i) => {
                const { current } = rankFor(s.total_xp, ranks);
                const t = TIER[current?.tier ?? "bronze"];
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                  >
                    <span className="w-7 text-center text-white/40 font-bold tabular-nums shrink-0">
                      {i + 4}
                    </span>
                    <div className="grow min-w-0">
                      <p className="font-bold truncate">
                        {nickOf.get(s.id) ?? s.full_name}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {[s.area, s.stage].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    <span
                      className={`hidden sm:inline text-[11px] font-bold rounded-full px-2 py-0.5 border shrink-0 ${t.bg} ${t.text}`}
                    >
                      {current?.name}
                    </span>
                    <span className="font-bold tabular-nums shrink-0 w-12 text-left">
                      {s.verified_xp}
                    </span>
                  </li>
                );
              })}
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
  nickOf,
  place,
  height,
}: {
  person?: { id: number; full_name: string; area: string | null; stage: string | null; verified_xp: number };
  nickOf: Map<number, string>;
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
        {nickOf.get(person.id) ?? person.full_name}
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
