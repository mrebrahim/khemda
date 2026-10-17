import Link from "next/link";
import NavBar from "@/components/NavBar";
import VisitRow, { type VisitStudent } from "@/components/VisitRow";
import { createClient } from "@/lib/supabase/server";
import { areaRank, getClassServants, stageRank } from "@/lib/reports";
import { weeksBetween, weekStartOf } from "@/lib/visits";
import { STAGES, AREAS, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

type Group = {
  key: string;
  stage: string;
  area: string;
  servants: string[];
  students: VisitStudent[];
};

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;
  const today = todayISO();
  const week = weekStartOf(today);

  const supabase = await createClient();
  const [{ data: students }, { data: visits }, servantsOf, { data: classRows }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, address, phone, father_phone, class_id")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("student_visits").select("student_id, week_start"),
      getClassServants(),
      supabase.from("classes").select("id, area, stage"),
    ]);

  // آخر أسبوع اتفتقد فيه كل ولد
  const lastOf = new Map<number, string>();
  const thisWeek = new Set<number>();
  for (const v of visits ?? []) {
    if (v.week_start === week) thisWeek.add(v.student_id);
    const prev = lastOf.get(v.student_id);
    if (!prev || v.week_start > prev) lastOf.set(v.student_id, v.week_start);
  }

  const classOf = new Map(
    (classRows ?? []).map((c) => [c.id, { area: c.area, stage: c.stage }]),
  );

  const groups = new Map<string, Group>();
  let neverVisited = 0;
  let visitedThisWeek = 0;
  let total = 0;

  for (const st of students ?? []) {
    const cls = classOf.get(st.class_id);
    if (!cls) continue;
    if ((stage && cls.stage !== stage) || (area && cls.area !== area)) continue;

    const last = lastOf.get(st.id) ?? null;
    const done = thisWeek.has(st.id);
    total++;
    if (!last) neverVisited++;
    if (done) visitedThisWeek++;

    const row: VisitStudent = {
      id: st.id,
      full_name: st.full_name,
      address: st.address,
      phone: st.phone,
      father_phone: st.father_phone,
      area: cls.area,
      visitedThisWeek: done,
      lastVisit: last,
      weeksAgo: last ? weeksBetween(last, week) : null,
    };

    const key = `${cls.stage}|${cls.area}`;
    const g: Group = groups.get(key) ?? {
      key,
      stage: cls.stage,
      area: cls.area,
      servants: servantsOf.get(st.class_id) ?? [],
      students: [],
    };
    g.students.push(row);
    groups.set(key, g);
  }

  // اللي عمره ما اتفتقد الأول، وبعدين الأقدم افتقادًا
  const list = [...groups.values()]
    .map((g) => ({
      ...g,
      students: g.students.sort((a, b) => {
        const av = a.visitedThisWeek ? 1 : 0;
        const bv = b.visitedThisWeek ? 1 : 0;
        if (av !== bv) return av - bv;
        const aw = a.weeksAgo ?? 9999;
        const bw = b.weeksAgo ?? 9999;
        if (aw !== bw) return bw - aw;
        return a.full_name.localeCompare(b.full_name, "ar");
      }),
    }))
    .sort(
      (a, b) =>
        stageRank(a.stage) - stageRank(b.stage) || areaRank(a.area) - areaRank(b.area),
    );

  const filterHref = (next: { stage?: string; area?: string }) => {
    const p = new URLSearchParams();
    const s = next.stage ?? stage;
    const a = next.area ?? area;
    if (s) p.set("stage", s);
    if (a) p.set("area", a);
    const q = p.toString();
    return q ? `/visits?${q}` : "/visits";
  };

  return (
    <>
      <NavBar title="الافتقاد بالفصول" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">افتقاد الأسبوع</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            كل ولد قدامه علامة — دوس عليها أول ما تفتقده. القايمة بتبدأ باللي
            بقاله أكتر وقت من غير افتقاد.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-2">
              <p className="font-bold text-emerald-800 text-xl tabular-nums">
                {visitedThisWeek}
              </p>
              <p className="text-[11px] text-emerald-700">اتفتقدوا الأسبوع ده</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl py-2">
              <p className="font-bold text-red-800 text-xl tabular-nums">
                {neverVisited}
              </p>
              <p className="text-[11px] text-red-700">عمرهم ما اتفتقدوا</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl py-2">
              <p className="font-bold text-slate-800 text-xl tabular-nums">{total}</p>
              <p className="text-[11px] text-slate-600">الإجمالي</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Chip href={filterHref({ stage: "" })} active={!stage} label="كل المراحل" />
            {STAGES.map((s) => (
              <Chip key={s} href={filterHref({ stage: s })} active={stage === s} label={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip href={filterHref({ area: "" })} active={!area} label="كل المناطق" />
            {AREAS.map((a) => (
              <Chip key={a} href={filterHref({ area: a })} active={area === a} label={a} />
            ))}
          </div>
        </section>

        {list.length === 0 && (
          <p className="text-center text-slate-500 py-8">مفيش مخدومين في الفلتر ده.</p>
        )}

        {list.map((g) => {
          const pending = g.students.filter((s) => !s.visitedThisWeek).length;
          return (
            <section
              key={g.key}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <header className="px-4 pt-4 pb-2 border-b border-slate-100">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold text-slate-800">
                    {g.stage} — {g.area}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {pending === 0
                      ? "خلصتوا الفصل كله 👏"
                      : `فاضل ${pending} من ${g.students.length}`}
                  </span>
                </div>
                {g.servants.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    الخدام: {g.servants.join(" • ")}
                  </p>
                )}
              </header>

              <ul className="px-4">
                {g.students.map((s) => (
                  <VisitRow key={s.id} student={s} />
                ))}
              </ul>
            </section>
          );
        })}

        <p className="text-center text-xs text-slate-500">
          الأسبوع بيبدأ السبت وبينتهي الجمعة — العلامات بتترجع فاضية كل سبت.
          <br />
          <Link href="/visitation" className="text-brand-700 font-bold hover:underline">
            افتقاد الخدام الشهري
          </Link>
        </p>
      </main>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
      }`}
    >
      {label}
    </a>
  );
}
