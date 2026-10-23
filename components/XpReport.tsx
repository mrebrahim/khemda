import { dayLabel, type XpReport } from "@/lib/xp-report";

/**
 * تقرير النقط — بيتعرض للخادم في صفحة الولد وللولد في صفحته.
 *
 * `tone="dark"` لصفحة الولد (الثيم الغامق)، و`"light"` لصفحات
 * الخدام.
 */
export default function XpReportView({
  report,
  tone = "light",
  limit = 40,
}: {
  report: XpReport;
  tone?: "light" | "dark";
  /** كام حركة نعرض في السجل */
  limit?: number;
}) {
  const dark = tone === "dark";
  const card = dark
    ? "b-frame p-4"
    : "bg-white rounded-2xl border border-slate-200 p-4";
  const title = dark ? "text-white" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const line = dark ? "border-white/10" : "border-slate-100";
  const earned = report.total + report.spent;

  if (report.entries.length === 0) {
    return (
      <section className={card}>
        <h2 className={`font-bold text-sm ${title}`}>📋 تقرير النقط</h2>
        <p className={`text-sm mt-2 ${muted}`}>لسه مفيش نقط مسجّلة.</p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {/* ملخص على إيه خد نقط */}
      <section className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={`font-bold text-sm ${title}`}>📋 خد نقط على إيه</h2>
          <span className={`text-[11px] tabular-nums ${muted}`}>
            {report.groups.filter((g) => g.xp > 0).length} نشاط
          </span>
        </div>

        <ul className="mt-3">
          {report.groups.map((g) => {
            const out = g.xp < 0;
            const share = earned > 0 ? Math.round((Math.abs(g.xp) / earned) * 100) : 0;
            return (
              <li key={g.ruleCode} className={`py-2 border-b last:border-0 ${line}`}>
                <div className="flex items-baseline gap-2">
                  <span className={`grow min-w-0 text-sm font-bold ${title}`}>
                    {g.label}
                  </span>
                  <span className={`shrink-0 text-[11px] tabular-nums ${muted}`}>
                    ×{g.count}
                  </span>
                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${
                      out ? "text-red-400" : dark ? "text-amber-300" : "text-emerald-700"
                    }`}
                    dir="ltr"
                  >
                    {out ? "" : "+"}
                    {g.xp}
                  </span>
                </div>
                {!out && (
                  <div className={`h-1 mt-1.5 ${dark ? "bg-white/10" : "bg-slate-100"}`}>
                    <div
                      className={`h-full ${dark ? "bg-amber-400/70" : "bg-emerald-500/70"}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className={`flex items-baseline justify-between gap-2 pt-3 mt-1 border-t ${line}`}>
          <span className={`text-sm font-bold ${title}`}>الرصيد</span>
          <span
            className={`text-lg font-bold tabular-nums ${dark ? "text-amber-400" : "text-emerald-700"}`}
          >
            {report.total}
          </span>
        </div>
        {report.spent > 0 && (
          <p className={`text-[11px] mt-1 ${muted}`}>
            كسب <span className="tabular-nums">{earned}</span> وصرف{" "}
            <span className="tabular-nums">{report.spent}</span> على الهدايا
          </p>
        )}
      </section>

      {/* السجل بالتواريخ */}
      <section className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={`font-bold text-sm ${title}`}>🗓️ كل نقطة ويوم إيه</h2>
          <span className={`text-[11px] tabular-nums ${muted}`}>
            {report.entries.length} حركة
          </span>
        </div>

        <ul className="mt-2">
          {report.entries.slice(0, limit).map((e) => (
            <li
              key={e.id}
              className={`flex items-baseline gap-2 py-2 border-b last:border-0 ${line}`}
            >
              <span className={`shrink-0 text-[11px] w-28 ${muted}`}>
                {dayLabel(e.date)}
              </span>
              <span className={`grow min-w-0 text-sm ${title}`}>
                <span className="font-bold">{e.label}</span>
                {e.note && (
                  <span className={`block text-[11px] ${muted} truncate`}>{e.note}</span>
                )}
              </span>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  e.xp < 0 ? "text-red-400" : dark ? "text-amber-300" : "text-emerald-700"
                }`}
                dir="ltr"
              >
                {e.xp < 0 ? "" : "+"}
                {e.xp}
              </span>
            </li>
          ))}
        </ul>

        {report.entries.length > limit && (
          <p className={`text-[11px] text-center mt-2 ${muted}`}>
            وده آخر {limit} حركة من {report.entries.length}
          </p>
        )}
      </section>
    </div>
  );
}
