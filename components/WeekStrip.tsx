import type { DayCell } from "@/lib/habits";

const AR_DAY = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

/**
 * تقويم العادة — آخر ٧ أيام.
 * الهدف إن الولد يشوف السلسلة بعينه، مش رقم بس.
 */
export default function WeekStrip({
  week,
  goal = 2,
}: {
  week: DayCell[];
  goal?: number;
}) {
  const activeDays = week.filter((d) => d.count > 0).length;

  return (
    <section className="b-frame p-3.5">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <h2 className="sec-title font-bold text-white text-sm">أسبوعك</h2>
        <span className="text-[11px] text-slate-400 tabular-nums">
          {activeDays} من ٧ أيام
        </span>
      </div>

      <ol className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const full = d.count >= goal;
          const some = d.count > 0 && !full;
          const dayName = AR_DAY[new Date(`${d.date}T12:00:00Z`).getUTCDay()];

          return (
            <li key={d.date} className="text-center">
              <span
                className={`block text-[10px] mb-1 ${
                  d.isToday ? "text-amber-400 font-bold" : "text-slate-500"
                }`}
              >
                {dayName}
              </span>
              <span
                title={`${d.date} — ${d.count} مهمة`}
                className={`grid place-content-center h-9 text-sm font-bold border transition ${
                  full
                    ? "bg-amber-500 text-slate-950 border-amber-300"
                    : some
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/50"
                      : d.isToday
                        ? "bg-white/5 text-slate-400 border-amber-400/70 border-dashed"
                        : "bg-white/5 text-slate-600 border-white/10"
                }`}
              >
                {full ? "🔥" : some ? "•" : d.isService ? "⛪" : ""}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        {activeDays === 7
          ? "أسبوع كامل من غير ما تغيب يوم — ده مستوى الأساطير 👑"
          : activeDays >= 4
            ? "ماشي صح! كمّل باقي الأيام وخلّيها عادة 🔥"
            : "خلّي كل يوم فيه مربع مولّع — دي اللي بتعمل الفرق"}
      </p>
    </section>
  );
}
