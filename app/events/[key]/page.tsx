import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import EventCountdown from "@/components/EventCountdown";
import Scanner from "@/components/Scanner";
import MigrationNeeded from "@/components/MigrationNeeded";
import EventRecorder, {
  type ClassGroup,
  type MarkState,
  type RecordStudent,
} from "@/components/EventRecorder";
import { createClient } from "@/lib/supabase/server";
import { cairoSecondsOfDay } from "@/lib/habits";
import { areaRank, getClassServants, stageRank } from "@/lib/reports";
import {
  eventByKey,
  lastOccurrence,
  recentOccurrences,
  timingOf,
  whenLabel,
} from "@/lib/events";
import { getRules } from "@/lib/xp";
import { formatArabicDate, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { key } = await params;
  const ev = eventByKey(key);
  if (!ev) notFound();

  const today = todayISO();
  const options = recentOccurrences(ev, 6, today);
  const { date: wanted } = await searchParams;
  const date = wanted && options.includes(wanted) ? wanted : lastOccurrence(ev, today);

  const supabase = await createClient();
  const [
    { data: students },
    { data: classRows },
    servantsOf,
    { data: marks, error: marksError },
    rules,
  ] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, class_id")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("classes").select("id, area, stage"),
      getClassServants(),
      supabase
        .from("event_marks")
        .select("student_id, place, bonus")
        .eq("event_key", ev.key)
        .eq("on_date", date),
      getRules(),
    ]);

  const classOf = new Map(
    (classRows ?? []).map((c) => [c.id, { area: c.area, stage: c.stage }]),
  );

  const groups = new Map<string, ClassGroup>();
  for (const st of students ?? []) {
    const cls = classOf.get(st.class_id);
    if (!cls) continue;
    const gkey = `${cls.stage}|${cls.area}`;
    const g: ClassGroup = groups.get(gkey) ?? {
      key: gkey,
      stage: cls.stage,
      area: cls.area,
      servants: servantsOf.get(st.class_id) ?? [],
      students: [],
    };
    const row: RecordStudent = {
      id: st.id,
      full_name: st.full_name,
      class_key: gkey,
      stage: cls.stage,
      area: cls.area,
    };
    g.students.push(row);
    groups.set(gkey, g);
  }

  const list = [...groups.values()].sort(
    (a, b) => stageRank(a.stage) - stageRank(b.stage) || areaRank(a.area) - areaRank(b.area),
  );

  const initial: Record<number, MarkState> = {};
  for (const m of marks ?? []) {
    initial[m.student_id] = {
      present: true,
      place: m.place ?? null,
      bonus: Boolean(m.bonus),
    };
  }

  const xpOf = new Map(rules.map((r) => [r.code, r.xp]));
  const entryXp = xpOf.get(ev.entryRule) ?? 0;
  const placeXp = ev.placeRules
    ? ([
        xpOf.get(ev.placeRules[0]) ?? 0,
        xpOf.get(ev.placeRules[1]) ?? 0,
        xpOf.get(ev.placeRules[2]) ?? 0,
      ] as [number, number, number])
    : null;

  const bonusXp = ev.bonusRule ? (xpOf.get(ev.bonusRule) ?? 0) : null;
  const timing = timingOf(ev, today, cairoSecondsOfDay());

  return (
    <>
      <NavBar title={`${ev.emoji} ${ev.label}`} back="/events" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        {marksError && <MigrationNeeded file="supabase/migrations/0018_event_marks.sql" />}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-800">{whenLabel(ev)}</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                بتسجّل على {formatArabicDate(date)}
              </p>
            </div>
            <EventCountdown
              seconds={timing.live ? timing.secondsLeft : timing.secondsToNext}
              live={timing.live}
            />
          </div>

          {options.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {options.map((d, i) => (
                <a
                  key={d}
                  href={`/events/${ev.key}?date=${d}`}
                  className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                    d === date
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
                  }`}
                >
                  {i === 0 ? "آخر مرة" : formatShort(d)}
                </a>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            دوس على الولد = حضر و+{entryXp} نقطة تنزل في رصيده فورًا. دوس تاني
            يشيل التسجيل ويرجّع النقط.
            {ev.placeRules && " المراكز بتتحدّد من الميداليات جنب الاسم."}
            {ev.bonusRule &&
              ` و⭐ معناها ${ev.bonusLabel} — بونص ${bonusXp} نقطة زيادة.`}
          </p>
        </section>

        <details className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 font-bold text-brand-900">
            📷 سجّل بمسح كود الولد
          </summary>
          <div className="px-4 pb-4">
            <Scanner event={{ key: ev.key, date, label: ev.label }} />
          </div>
        </details>

        <EventRecorder
          eventKey={ev.key}
          date={date}
          label={ev.label}
          emoji={ev.emoji}
          entryXp={entryXp}
          placeXp={placeXp}
          bonusXp={bonusXp}
          bonusLabel={ev.bonusLabel}
          groups={list}
          initial={initial}
          readOnly={false}
        />

        <p className="text-center text-xs text-slate-500">
          <Link
            href={`/events/${ev.key}/weeks`}
            className="text-brand-700 font-bold hover:underline"
          >
            📅 سجل الأسابيع — مين حضر كل أسبوع
          </Link>
        </p>
      </main>
    </>
  );
}

function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}
