import Link from "next/link";
import NavBar from "@/components/NavBar";
import CopyBox from "@/components/CopyBox";
import PrintButton from "@/components/PrintButton";
import SessionPicker from "@/components/SessionPicker";
import { createClient } from "@/lib/supabase/server";
import { areaRank, getClassServants, stageRank } from "@/lib/reports";
import { STUDENT_FIELDS, formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

type ClassRow = {
  id: number;
  area: string;
  stage: string;
  saint_name: string | null;
  servants: string[];
  total: number;
  came: number;
  counts: Record<string, number>;
};

export default async function DayReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: wanted } = await searchParams;
  const supabase = await createClient();

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, session_date, is_monthly_mass")
    .order("session_date", { ascending: false })
    .limit(60);

  const sessions = sessionRows ?? [];
  if (sessions.length === 0) {
    return (
      <>
        <NavBar title="تقرير اليوم بالفصول" back="/reports" />
        <main className="max-w-4xl mx-auto px-3 py-10 text-center text-slate-500">
          لسه مفيش أيام حضور مسجّلة
        </main>
      </>
    );
  }

  const session =
    sessions.find((s) => s.session_date === wanted) ?? sessions[0];

  const [{ data: classRows }, { data: students }, { data: attendance }, servantsOf] =
    await Promise.all([
      supabase.from("classes").select("id, area, stage, saint_name"),
      supabase.from("students").select("id, class_id").eq("is_active", true),
      supabase
        .from("student_attendance")
        .select("student_id, mass, communion, service, tasbeha")
        .eq("session_id", session.id),
      getClassServants(),
    ]);

  const attOf = new Map(
    (attendance ?? []).map((a) => [a.student_id, a as Record<string, boolean | number>]),
  );
  const studentsOf = new Map<number, number[]>();
  for (const st of students ?? []) {
    if (st.class_id == null) continue;
    studentsOf.set(st.class_id, [...(studentsOf.get(st.class_id) ?? []), st.id]);
  }

  const rows: ClassRow[] = (classRows ?? [])
    .map((c) => {
      const ids = studentsOf.get(c.id) ?? [];
      const counts: Record<string, number> = {};
      for (const f of STUDENT_FIELDS) counts[f.key] = 0;
      let came = 0;

      for (const id of ids) {
        const a = attOf.get(id);
        if (!a) continue;
        let any = false;
        for (const f of STUDENT_FIELDS) {
          if (a[f.key]) {
            counts[f.key]++;
            any = true;
          }
        }
        if (any) came++;
      }

      return {
        id: c.id,
        area: c.area,
        stage: c.stage,
        saint_name: c.saint_name,
        servants: servantsOf.get(c.id) ?? [],
        total: ids.length,
        came,
        counts,
      };
    })
    .filter((r) => r.total > 0)
    .sort(
      (a, b) =>
        stageRank(a.stage) - stageRank(b.stage) ||
        areaRank(a.area) - areaRank(b.area),
    );

  const sum = (pick: (r: ClassRow) => number) => rows.reduce((n, r) => n + pick(r), 0);
  const grand = {
    total: sum((r) => r.total),
    came: sum((r) => r.came),
    counts: Object.fromEntries(
      STUDENT_FIELDS.map((f) => [f.key, sum((r) => r.counts[f.key])]),
    ) as Record<string, number>,
  };

  const pct = (n: number, of: number) => (of === 0 ? 0 : Math.round((n / of) * 100));

  const text = [
    `📊 تقرير ${formatArabicDate(session.session_date)}${session.is_monthly_mass ? " (القداس الشهري ⭐)" : ""}`,
    "",
    ...rows.flatMap((r) => [
      `▫️ ${r.stage} — ${r.area}${r.servants.length ? ` (${r.servants.join(" • ")})` : ""}`,
      `حضر ${r.came} من ${r.total} (${pct(r.came, r.total)}%)`,
      STUDENT_FIELDS.map((f) => `${f.label}: ${r.counts[f.key]}`).join(" • "),
      "",
    ]),
    `الإجمالي: حضر ${grand.came} من ${grand.total} (${pct(grand.came, grand.total)}%)`,
    STUDENT_FIELDS.map((f) => `${f.label}: ${grand.counts[f.key]}`).join(" • "),
  ].join("\n");

  return (
    <>
      <div className="print:hidden">
        <NavBar title="تقرير اليوم بالفصول" back="/reports" />
      </div>

      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <SessionPicker date={session.session_date} sessions={sessions} />

        <header className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-lg text-slate-800">
            {formatArabicDate(session.session_date)}
            {session.is_monthly_mass && (
              <span className="text-amber-600 text-sm mr-2">⭐ القداس الشهري</span>
            )}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            حضر <b className="text-brand-700">{grand.came}</b> من {grand.total} مخدوم
            <span className="text-slate-400"> — </span>
            <b>{pct(grand.came, grand.total)}%</b>
          </p>
          <div className="mt-3 print:hidden">
            <PrintButton />
          </div>
        </header>

        {/* على الموبايل: كارت لكل فصل — أسهل من جدول بيتزحلق */}
        <div className="sm:hidden print:hidden space-y-2">
          {rows.map((r) => (
            <article key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-slate-800">
                  {r.stage} — {r.area}
                </h3>
                <span className="text-sm shrink-0">
                  <b className="text-brand-700 tabular-nums">{r.came}</b>
                  <span className="text-slate-500 tabular-nums"> / {r.total}</span>
                  <span className="text-slate-400 text-xs tabular-nums">
                    {" "}
                    ({pct(r.came, r.total)}%)
                  </span>
                </span>
              </div>

              {r.servants.length > 0 && (
                <p className="text-[11px] text-slate-500 mt-0.5">{r.servants.join(" • ")}</p>
              )}

              <span className="block h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <span
                  className="block h-full bg-brand-500 rounded-full"
                  style={{ width: `${pct(r.came, r.total)}%` }}
                />
              </span>

              <dl className="grid grid-cols-4 gap-1.5 mt-3">
                {STUDENT_FIELDS.map((f) => (
                  <div key={f.key} className="bg-slate-50 rounded-lg py-1.5 text-center">
                    <dt className="text-[10px] text-slate-500">{f.label}</dt>
                    <dd
                      className={`font-bold tabular-nums ${
                        r.counts[f.key] ? "text-slate-800" : "text-slate-300"
                      }`}
                    >
                      {r.counts[f.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}

          <article className="bg-slate-800 text-white rounded-2xl p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold">الإجمالي</h3>
              <span className="text-sm">
                <b className="tabular-nums">{grand.came}</b>
                <span className="text-slate-300 tabular-nums"> / {grand.total}</span>
                <span className="text-slate-400 text-xs tabular-nums">
                  {" "}
                  ({pct(grand.came, grand.total)}%)
                </span>
              </span>
            </div>
            <dl className="grid grid-cols-4 gap-1.5 mt-3">
              {STUDENT_FIELDS.map((f) => (
                <div key={f.key} className="bg-white/10 rounded-lg py-1.5 text-center">
                  <dt className="text-[10px] text-slate-300">{f.label}</dt>
                  <dd className="font-bold tabular-nums">{grand.counts[f.key]}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        {/* على الشاشات الكبيرة وفي الطباعة: جدول */}
        <section className="hidden sm:block print:block bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-3 py-2.5 font-bold whitespace-nowrap">الفصل</th>
                <th className="px-2 py-2.5 font-bold whitespace-nowrap">المخدومين</th>
                <th className="px-2 py-2.5 font-bold whitespace-nowrap">حضر</th>
                {STUDENT_FIELDS.map((f) => (
                  <th key={f.key} className="px-2 py-2.5 font-bold whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 even:bg-slate-50/60">
                  <td className="px-3 py-2.5">
                    <span className="font-bold text-slate-800 whitespace-nowrap">
                      {r.stage} — {r.area}
                    </span>
                    {r.servants.length > 0 && (
                      <span className="block text-[11px] text-slate-500 truncate max-w-[180px]">
                        {r.servants.join(" • ")}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-slate-500 tabular-nums">
                    {r.total}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="font-bold text-slate-900 tabular-nums">{r.came}</span>
                    <span className="block text-[11px] text-slate-500 tabular-nums">
                      {pct(r.came, r.total)}%
                    </span>
                  </td>
                  {STUDENT_FIELDS.map((f) => (
                    <td
                      key={f.key}
                      className="px-2 py-2.5 text-center font-bold tabular-nums text-slate-700"
                    >
                      {r.counts[f.key] || <span className="text-slate-300">0</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-3 py-2.5 text-slate-800">الإجمالي</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{grand.total}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">
                  {grand.came}
                  <span className="block text-[11px] font-normal text-slate-500">
                    {pct(grand.came, grand.total)}%
                  </span>
                </td>
                {STUDENT_FIELDS.map((f) => (
                  <td key={f.key} className="px-2 py-2.5 text-center tabular-nums">
                    {grand.counts[f.key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </section>

        {/* نسخة نصّية للواتساب */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 print:hidden">
          <h3 className="font-bold text-slate-800 mb-2">التقرير كنص للواتساب</h3>
          <CopyBox text={text} />
        </section>

        <p className="text-center text-xs text-slate-500 print:hidden">
          عايز أسامي اللي غابوا؟{" "}
          <Link
            href={`/absent?date=${session.session_date}&by=service`}
            className="text-brand-700 font-bold hover:underline"
          >
            كشف الغياب
          </Link>
        </p>
      </main>
    </>
  );
}
