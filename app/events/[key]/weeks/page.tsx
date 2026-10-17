import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { eventByKey, recentOccurrences, PLACE_MEDAL } from "@/lib/events";
import { formatArabicDate, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEKS = 10;

type MarkRow = {
  student_id: number;
  on_date: string;
  place: number | null;
  students: { full_name: string } | { full_name: string }[] | null;
};

function nameOf(row: MarkRow): string {
  const s = row.students;
  if (!s) return "—";
  return Array.isArray(s) ? (s[0]?.full_name ?? "—") : s.full_name;
}

export default async function EventWeeksPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const ev = eventByKey(key);
  if (!ev) notFound();

  const today = todayISO();
  const dates = recentOccurrences(ev, WEEKS, today);

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_marks")
    .select("student_id, on_date, place, students(full_name)")
    .eq("event_key", ev.key)
    .in("on_date", dates);

  const rows = (data ?? []) as MarkRow[];

  const byDate = new Map<string, MarkRow[]>();
  const tally = new Map<number, { name: string; times: number; medals: number }>();
  for (const r of rows) {
    const list = byDate.get(r.on_date) ?? [];
    list.push(r);
    byDate.set(r.on_date, list);

    const t = tally.get(r.student_id) ?? { name: nameOf(r), times: 0, medals: 0 };
    t.times++;
    if (r.place) t.medals++;
    tally.set(r.student_id, t);
  }

  const top = [...tally.values()]
    .sort((a, b) => b.times - a.times || b.medals - a.medals || a.name.localeCompare(b.name, "ar"))
    .slice(0, 12);

  const weeksWithData = dates.filter((d) => (byDate.get(d)?.length ?? 0) > 0).length;

  return (
    <>
      <NavBar title={`سجل ${ev.label}`} back={`/events/${ev.key}`} />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">آخر {WEEKS} أسابيع</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            كل أسبوع ومين حضر فيه. الأسابيع اللي فيها تسجيل:{" "}
            <span className="font-bold tabular-nums">{weeksWithData}</span> من {WEEKS}.
          </p>
        </section>

        {dates.map((d) => {
          const list = (byDate.get(d) ?? []).sort(
            (a, b) => (a.place ?? 9) - (b.place ?? 9) || nameOf(a).localeCompare(nameOf(b), "ar"),
          );
          const podium = [1, 2, 3].map((p) => list.find((r) => r.place === p) ?? null);

          return (
            <section
              key={d}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <header className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">
                    {formatArabicDate(d)}
                  </h3>
                  {ev.placeRules && podium.some(Boolean) && (
                    <p className="text-xs text-amber-700 font-bold mt-0.5 truncate">
                      {podium
                        .map((r, i) => (r ? `${PLACE_MEDAL[i]} ${nameOf(r)}` : null))
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-sm font-bold tabular-nums ${
                    list.length > 0
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}
                >
                  {list.length}
                </span>
              </header>

              {list.length > 0 ? (
                <details className="px-4 pb-3">
                  <summary className="cursor-pointer text-xs font-bold text-brand-700">
                    شوف الأسماء
                  </summary>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-x-3">
                    {list.map((r) => (
                      <li
                        key={r.student_id}
                        className="text-sm text-slate-700 py-1 border-b border-slate-100 last:border-0"
                      >
                        {r.place ? `${PLACE_MEDAL[r.place - 1]} ` : "• "}
                        {nameOf(r)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <p className="px-4 pb-3 text-xs text-slate-400">
                  محدش متسجّل في اليوم ده —{" "}
                  <Link
                    href={`/events/${ev.key}?date=${d}`}
                    className="text-brand-700 font-bold hover:underline"
                  >
                    سجّل دلوقتي
                  </Link>
                </p>
              )}
            </section>
          );
        })}

        {top.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-800">
              أكتر ولاد {ev.placeRules ? "بيدخلوا" : "بيحضروا"}
            </h2>
            <ul className="mt-2">
              {top.map((t, i) => (
                <li
                  key={t.name + i}
                  className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="w-6 text-xs text-slate-400 tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <span className="grow font-bold text-slate-700 truncate">{t.name}</span>
                  {t.medals > 0 && (
                    <span className="text-xs text-amber-700 font-bold shrink-0">
                      {t.medals} 🏅
                    </span>
                  )}
                  <span className="text-sm font-bold text-emerald-700 tabular-nums shrink-0">
                    {t.times}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
