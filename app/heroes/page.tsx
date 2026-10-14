import Link from "next/link";
import NavBar from "@/components/NavBar";
import { getLeaderboard, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { STAGES, AREAS } from "@/lib/types";

export const dynamic = "force-dynamic";

const TIER_STYLE: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-900 border-amber-300",
  silver: "bg-slate-100 text-slate-700 border-slate-300",
  gold: "bg-yellow-100 text-yellow-900 border-yellow-400",
  platinum: "bg-cyan-100 text-cyan-900 border-cyan-300",
  legendary: "bg-violet-100 text-violet-900 border-violet-400",
};

export default async function HeroesPage({
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

  if (!season) {
    return (
      <>
        <NavBar title="لوحة الأبطال" back="/" />
        <main className="max-w-4xl mx-auto px-3 py-10 text-center text-slate-400">
          مفيش موسم نشط دلوقتي
        </main>
      </>
    );
  }

  const filtered = board.filter(
    (s) => (!stage || s.stage === stage) && (!area || s.area === area),
  );
  const active = filtered.filter((s) => s.total_xp > 0);

  return (
    <>
      <NavBar title="لوحة الأبطال" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <section className="g-bg g-card text-white p-5 text-center">
          <p className="text-xs opacity-80">الموسم الحالي</p>
          <h2 className="font-bold text-xl">{season.name}</h2>
          <p className="text-xs opacity-80 mt-1" dir="ltr">
            {season.starts_on} → {season.ends_on}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="أبطال" value={active.length} />
            <Stat label="أعلى نقاط" value={active[0]?.verified_xp ?? 0} />
            <Stat
              label="متوسط"
              value={
                active.length
                  ? Math.round(
                      active.reduce((s, x) => s + x.verified_xp, 0) / active.length,
                    )
                  : 0
              }
            />
          </div>
        </section>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
          <Chips param="stage" value={stage} options={[...STAGES]} allLabel="كل المراحل" area={area} />
          <Chips param="area" value={area} options={[...AREAS]} allLabel="كل المناطق" stage={stage} />
          <p className="text-xs text-slate-500">
            الترتيب على <b>Verified XP</b> — النقاط الموثقة من الحضور والمسابقات.
            المهمات الشخصية (الصلاة والكتاب) مش داخلة في الترتيب العلني.
          </p>
        </div>

        <ol className="space-y-2">
          {active.map((s, i) => {
            const { current, next, progress, toNext } = rankFor(s.total_xp, ranks);
            const tier = TIER_STYLE[current?.tier ?? "bronze"];
            return (
              <li
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 w-9 h-9 grid place-content-center rounded-full font-bold text-sm ${
                      i === 0
                        ? "bg-yellow-400 text-yellow-950"
                        : i === 1
                          ? "bg-slate-300 text-slate-800"
                          : i === 2
                            ? "bg-amber-600 text-white"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>

                  <div className="grow min-w-0">
                    <Link
                      href={`/students/${s.id}`}
                      className="font-bold text-brand-900 hover:underline"
                    >
                      {s.full_name}
                    </Link>
                    <p className="text-[11px] text-slate-400">
                      {[s.area, s.stage].filter(Boolean).join(" — ")}
                    </p>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="font-bold text-lg text-brand-800 tabular-nums">
                      {s.verified_xp}
                    </p>
                    <p className="text-[11px] text-slate-400">XP موثقة</p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold rounded-full px-2 py-0.5 border shrink-0 ${tier}`}
                  >
                    {current?.name ?? "—"}
                  </span>
                  <span
                    className="h-1.5 grow rounded-full bg-slate-100 overflow-hidden"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${progress}%`, background: "#2a78d6" }}
                    />
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                    {next ? `فاضل ${toNext}` : "أعلى رتبة"}
                  </span>
                </div>
              </li>
            );
          })}

          {active.length === 0 && (
            <li className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
              مفيش نقاط مسجّلة لحد دلوقتي
            </li>
          )}
        </ol>

        {filtered.length > active.length && (
          <p className="text-center text-sm text-slate-500">
            + {filtered.length - active.length} مخدوم لسه مرصيدهمش نقاط
          </p>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 rounded-xl py-2">
      <p className="font-bold text-xl tabular-nums">{value}</p>
      <p className="text-[11px] opacity-80">{label}</p>
    </div>
  );
}

function Chips({
  param,
  value,
  options,
  allLabel,
  stage,
  area,
}: {
  param: "stage" | "area";
  value?: string;
  options: string[];
  allLabel: string;
  stage?: string;
  area?: string;
}) {
  const href = (v: string) => {
    const p = new URLSearchParams();
    const next = { stage, area, [param]: v || undefined };
    if (next.stage) p.set("stage", next.stage);
    if (next.area) p.set("area", next.area);
    const q = p.toString();
    return q ? `/heroes?${q}` : "/heroes";
  };

  return (
    <div className="flex flex-wrap gap-1">
      {[{ v: "", l: allLabel }, ...options.map((o) => ({ v: o, l: o }))].map((o) => (
        <Link
          key={o.v}
          href={href(o.v)}
          className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
            (value ?? "") === o.v
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
          }`}
        >
          {o.l}
        </Link>
      ))}
    </div>
  );
}
