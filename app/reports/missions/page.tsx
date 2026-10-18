import Link from "next/link";
import NavBar from "@/components/NavBar";
import CopyBox from "@/components/CopyBox";
import { createClient } from "@/lib/supabase/server";
import { areaRank, getClassServants, stageRank } from "@/lib/reports";
import { shiftDate, todayISO, formatArabicDate, STAGES, AREAS } from "@/lib/types";
import { OPEN_HOUR, cairoHour } from "@/lib/habits";

export const dynamic = "force-dynamic";

const DAYS = 10;

type Row = {
  id: number;
  name: string;
  prayer: boolean;
  bible: boolean;
  loggedInToday: boolean;
  everLoggedIn: boolean;
  streak: number;
  lastLogin: string | null;
};

type Group = {
  key: string;
  stage: string;
  area: string;
  servants: string[];
  students: Row[];
};

type Filter = "all" | "full" | "partial" | "idle" | "never";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "full", label: "خلّصوا المهمتين" },
  { key: "partial", label: "عملوا واحدة بس" },
  { key: "idle", label: "دخلوا وما عملوش" },
  { key: "never", label: "عمرهم ما دخلوا" },
];

function statusOf(r: Row): Filter {
  const n = (r.prayer ? 1 : 0) + (r.bible ? 1 : 0);
  if (n === 2) return "full";
  if (n === 1) return "partial";
  return r.everLoggedIn ? "idle" : "never";
}

export default async function MissionsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; filter?: string; stage?: string; area?: string }>;
}) {
  const { date: wanted, filter: rawFilter, stage, area } = await searchParams;
  const today = todayISO();
  const days = Array.from({ length: DAYS }, (_, i) => shiftDate(today, -i));
  const date = wanted && days.includes(wanted) ? wanted : today;
  const filter = (FILTERS.find((f) => f.key === rawFilter)?.key ?? "all") as Filter;

  const supabase = await createClient();
  const [
    { data: students },
    { data: classRows },
    servantsOf,
    { data: missions },
    { data: logins },
    { data: accounts },
    { data: streaks },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, class_id")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("classes").select("id, area, stage"),
    getClassServants(),
    supabase.from("daily_missions").select("student_id, rule_code").eq("on_date", date),
    supabase.from("student_logins").select("student_id").eq("on_date", date),
    supabase.from("student_accounts").select("student_id, last_login_at"),
    supabase.from("student_streaks").select("student_id, current_streak"),
  ]);

  const prayerSet = new Set(
    (missions ?? []).filter((m) => m.rule_code === "prayer").map((m) => m.student_id),
  );
  const bibleSet = new Set(
    (missions ?? []).filter((m) => m.rule_code === "bible").map((m) => m.student_id),
  );
  const loginSet = new Set((logins ?? []).map((l) => l.student_id));
  const lastLoginOf = new Map(
    (accounts ?? []).map((a) => [a.student_id, a.last_login_at as string | null]),
  );
  const streakOf = new Map((streaks ?? []).map((s) => [s.student_id, s.current_streak]));
  const classOf = new Map(
    (classRows ?? []).map((c) => [c.id, { area: c.area, stage: c.stage }]),
  );

  const groups = new Map<string, Group>();
  const tally = { all: 0, full: 0, partial: 0, idle: 0, never: 0 };

  for (const st of students ?? []) {
    const cls = classOf.get(st.class_id);
    if (!cls) continue;
    if ((stage && cls.stage !== stage) || (area && cls.area !== area)) continue;

    const last = lastLoginOf.get(st.id) ?? null;
    const row: Row = {
      id: st.id,
      name: st.full_name,
      prayer: prayerSet.has(st.id),
      bible: bibleSet.has(st.id),
      loggedInToday: loginSet.has(st.id),
      everLoggedIn: Boolean(last),
      streak: streakOf.get(st.id) ?? 0,
      lastLogin: last,
    };

    tally.all++;
    tally[statusOf(row)]++;

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

  // اللي عمل أكتر فوق، وبعدين اللي دخل، وبعدين الباقي
  const rank = (r: Row) =>
    (r.prayer ? 1 : 0) + (r.bible ? 1 : 0) * 1 + (r.loggedInToday ? 0.5 : 0);

  const list = [...groups.values()]
    .map((g) => ({
      ...g,
      students: g.students
        .filter((r) => filter === "all" || statusOf(r) === filter)
        .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, "ar")),
    }))
    .filter((g) => g.students.length > 0)
    .sort(
      (a, b) =>
        stageRank(a.stage) - stageRank(b.stage) || areaRank(a.area) - areaRank(b.area),
    );

  const beforeOpen = date === today && cairoHour() < OPEN_HOUR;

  const text = [
    `📋 تقرير المهمات اليومية — ${formatArabicDate(date)}`,
    `خلّصوا المهمتين: ${tally.full} • واحدة بس: ${tally.partial} • دخلوا وما عملوش: ${tally.idle} • عمرهم ما دخلوا: ${tally.never}`,
    "",
    ...list.flatMap((g) => [
      `— ${g.stage} ${g.area} —`,
      ...g.students.map((r) => {
        const mark = r.prayer && r.bible ? "✅" : r.prayer || r.bible ? "🟡" : "❌";
        const what = [r.prayer ? "صلاة" : null, r.bible ? "إصحاح" : null]
          .filter(Boolean)
          .join(" + ");
        return `${mark} ${r.name}${what ? ` — ${what}` : r.everLoggedIn ? " — ما عملش" : " — عمره ما دخل"}`;
      }),
      "",
    ]),
  ].join("\n");

  const href = (next: Partial<{ date: string; filter: string; stage: string; area: string }>) => {
    const p = new URLSearchParams();
    const d = next.date ?? date;
    const f = next.filter ?? filter;
    const s = next.stage ?? stage ?? "";
    const a = next.area ?? area ?? "";
    if (d !== today) p.set("date", d);
    if (f !== "all") p.set("filter", f);
    if (s) p.set("stage", s);
    if (a) p.set("area", a);
    const q = p.toString();
    return q ? `/reports/missions?${q}` : "/reports/missions";
  };

  return (
    <>
      <NavBar title="تقرير المهمات اليومية" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">مين دخل ومين عمل مهمته</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            كل ولد وقدامه مهمة الصلاة 🙏 ومهمة الإصحاح 📖 في يوم{" "}
            {formatArabicDate(date)}.
          </p>

          {beforeOpen && (
            <p className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 leading-relaxed">
              المهمات بتفتح الساعة ٧ بالليل، ولسه الوقت ما جاش النهارده — فطبيعي
              الأرقام تبقى صغيرة دلوقتي.
            </p>
          )}

          <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
            <Stat n={tally.full} label="المهمتين" tone="green" />
            <Stat n={tally.partial} label="واحدة بس" tone="amber" />
            <Stat n={tally.idle} label="دخلوا وبس" tone="slate" />
            <Stat n={tally.never} label="عمرهم ما دخلوا" tone="red" />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {days.map((d, i) => (
              <a
                key={d}
                href={href({ date: d })}
                className={chip(d === date)}
              >
                {i === 0 ? "النهارده" : formatShort(d)}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {FILTERS.map((f) => (
              <a key={f.key} href={href({ filter: f.key })} className={chip(f.key === filter)}>
                {f.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <a href={href({ stage: "" })} className={chip(!stage)}>كل المراحل</a>
            {STAGES.map((s) => (
              <a key={s} href={href({ stage: s })} className={chip(stage === s)}>{s}</a>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <a href={href({ area: "" })} className={chip(!area)}>كل المناطق</a>
            {AREAS.map((a) => (
              <a key={a} href={href({ area: a })} className={chip(area === a)}>{a}</a>
            ))}
          </div>
        </section>

        {list.length === 0 && (
          <p className="text-center text-slate-500 py-8">مفيش مخدومين في الفلتر ده.</p>
        )}

        {list.map((g) => {
          const full = g.students.filter((r) => r.prayer && r.bible).length;
          return (
            <section
              key={g.key}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <header className="px-4 pt-3 pb-2 border-b border-slate-100">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold text-slate-800">
                    {g.stage} — {g.area}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {full} من {g.students.length} خلّصوا
                  </span>
                </div>
                {g.servants.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الخدام: {g.servants.join(" • ")}
                  </p>
                )}
              </header>

              <ul className="px-3">
                {g.students.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="grow min-w-0">
                      <p className="font-bold text-slate-800 truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.everLoggedIn ? (
                          <>
                            {r.loggedInToday ? "دخل اليوم ده" : "ما دخلش اليوم ده"}
                            {r.lastLogin && ` • آخر دخول ${shortDate(r.lastLogin)}`}
                          </>
                        ) : (
                          <span className="text-red-700 font-bold">
                            عمره ما دخل اللعبة
                          </span>
                        )}
                      </p>
                    </div>

                    {r.streak > 0 && (
                      <span className="shrink-0 text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                        🔥 {r.streak}
                      </span>
                    )}

                    <Mark on={r.prayer} emoji="🙏" label="مهمة الصلاة" />
                    <Mark on={r.bible} emoji="📖" label="مهمة الإصحاح" />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm">نسخة نصّية للجروب</h3>
          <p className="text-xs text-slate-500 mt-1">
            التقرير كامل بالأسماء — انسخه وابعته لخدام الفصول.
          </p>
          <div className="mt-2">
            <CopyBox text={text} label="انسخ التقرير" />
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">
          <Link href="/nudge" className="text-brand-700 font-bold hover:underline">
            🔔 ابعت تذكير للي سلسلته هتقطع
          </Link>
        </p>
      </main>
    </>
  );
}

function chip(active: boolean): string {
  return `rounded-full px-3 py-1 text-xs font-bold border transition ${
    active
      ? "bg-brand-600 text-white border-brand-600"
      : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
  }`;
}

function Mark({ on, emoji, label }: { on: boolean; emoji: string; label: string }) {
  return (
    <span
      title={label}
      aria-label={`${label}: ${on ? "عملها" : "ما عملهاش"}`}
      className={`shrink-0 w-9 h-9 rounded-xl border grid place-content-center text-base ${
        on
          ? "bg-emerald-50 border-emerald-300"
          : "bg-slate-50 border-slate-200 opacity-35 grayscale"
      }`}
    >
      {emoji}
    </span>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "green" | "amber" | "slate" | "red";
}) {
  const colors = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    red: "bg-red-50 border-red-200 text-red-800",
  }[tone];
  return (
    <div className={`rounded-xl border py-2 ${colors}`}>
      <p className="font-bold text-xl tabular-nums">{n}</p>
      <p className="text-[10px] leading-tight px-1">{label}</p>
    </div>
  );
}

function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function shortDate(ts: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(ts));
}
