import Link from "next/link";
import NavBar from "@/components/NavBar";
import EventCountdown from "@/components/EventCountdown";
import MigrationNeeded from "@/components/MigrationNeeded";
import { createClient } from "@/lib/supabase/server";
import { cairoSecondsOfDay } from "@/lib/habits";
import {
  EVENTS,
  lastOccurrence,
  timingOf,
  whenLabel,
  PLACE_MEDAL,
} from "@/lib/events";
import { getRules } from "@/lib/xp";
import { formatArabicDate, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventsHubPage() {
  const today = todayISO();
  const secondsOfDay = cairoSecondsOfDay();

  const supabase = await createClient();
  const dates = EVENTS.map((e) => lastOccurrence(e, today));

  const [{ count: total }, { data: marks, error: marksError }, rules] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("event_marks")
      .select("event_key, on_date, place")
      .in("on_date", [...new Set(dates)]),
    getRules(),
  ]);

  const xpOf = new Map(rules.map((r) => [r.code, r.xp]));

  const cards = EVENTS.map((ev, i) => {
    const date = dates[i];
    const rows = (marks ?? []).filter(
      (m) => m.event_key === ev.key && m.on_date === date,
    );
    return {
      ev,
      date,
      count: rows.length,
      places: rows.filter((r) => r.place !== null).length,
      timing: timingOf(ev, today, secondsOfDay),
      xp: xpOf.get(ev.entryRule) ?? 0,
    };
  }).sort((a, b) => {
    if (a.timing.live !== b.timing.live) return a.timing.live ? -1 : 1;
    return a.timing.secondsToNext - b.timing.secondsToNext;
  });

  return (
    <>
      <NavBar title="مواعيد الخدمة والنقط" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        {marksError && <MigrationNeeded file="supabase/migrations/0018_event_marks.sql" />}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">سجّل الحضور وخد البونص</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            كل معاد له شاشة تسجيل. دوس على اسم الولد = حضر، ونقطه تنزل في رصيده
            على طول وترفع ليفله. دوس تاني يشيل التسجيل ويرجّع النقط.
          </p>
          <p className="text-xs text-slate-500 mt-2">النهاردة {formatArabicDate(today)}</p>
        </section>

        {cards.map(({ ev, date, count, places, timing, xp }) => (
          <Link
            key={ev.key}
            href={`/events/${ev.key}`}
            className={`block rounded-2xl border p-4 transition hover:shadow-md ${
              timing.live
                ? "bg-red-50 border-red-300"
                : "bg-white border-slate-200 hover:border-brand-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0" aria-hidden="true">
                {ev.emoji}
              </span>
              <div className="grow min-w-0">
                <h3 className="font-bold text-lg text-brand-900">{ev.label}</h3>
                <p className="text-sm text-slate-600">{whenLabel(ev)}</p>
                <div className="mt-2">
                  <EventCountdown
                    seconds={timing.live ? timing.secondsLeft : timing.secondsToNext}
                    live={timing.live}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  آخر مرة ({formatArabicDate(date)}):{" "}
                  <span className="font-bold text-slate-700 tabular-nums">{count}</span>{" "}
                  من {total ?? 0}
                  {ev.placeRules && (
                    <>
                      {" • "}
                      <span className="font-bold text-amber-700">
                        {places === 3 ? `المنصة كاملة ${PLACE_MEDAL.join("")}` : `${places} / 3 مراكز`}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-brand-50 border border-brand-200 px-2 py-1 text-center">
                <span className="block text-lg font-bold text-brand-800 tabular-nums">
                  +{xp}
                </span>
                <span className="block text-[10px] text-brand-700">نقطة</span>
              </span>
            </div>
          </Link>
        ))}

        <p className="text-center text-xs text-slate-500 leading-relaxed">
          القداس والتسبحة ومدارس الأحد بيتسجّلوا في كشف الحضور كمان، فتقرير
          الجمعة بيطلع مظبوط من غير شغل مرتين.
          <br />
          <Link href="/check-in" className="text-brand-700 font-bold hover:underline">
            أو سجّل حضور مدارس الأحد بمسح الكود
          </Link>
        </p>
      </main>
    </>
  );
}
