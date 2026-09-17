import NavBar from "@/components/NavBar";
import MonthPicker from "@/components/MonthPicker";
import BarChart from "@/components/BarChart";
import SplitBar from "@/components/SplitBar";
import { createClient } from "@/lib/supabase/server";
import { getStudentsMonth } from "@/lib/reports";
import { currentMonth, isValidMonth } from "@/lib/month";
import { STAGES, AREAS, STUDENT_FIELDS, formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = isValidMonth(raw) ? raw : currentMonth();

  const { sessions, students } = await getStudentsMonth(month);
  const total = students.length;
  const came = students.filter((s) => s.anyAttendance > 0).length;
  const never = total - came;

  // حضور كل يوم على حدة
  const supabase = await createClient();
  const perSession: { label: string; value: number }[] = [];
  if (sessions.length > 0) {
    const { data: att } = await supabase
      .from("student_attendance")
      .select("session_id, mass, communion, service, tasbeha")
      .in("session_id", sessions.map((s) => s.id));

    for (const s of sessions) {
      const n = (att ?? []).filter(
        (r) =>
          r.session_id === s.id &&
          (r.mass || r.communion || r.service || r.tasbeha),
      ).length;
      perSession.push({
        label: formatArabicDate(s.session_date).replace(/^\S+\s/, ""),
        value: n,
      });
    }
  }

  const byField = STUDENT_FIELDS.map((f) => ({
    label: f.label,
    value: students.reduce((sum, s) => sum + s[f.key], 0),
  }));

  return (
    <>
      <NavBar title="ملخص الشهر — المخدومين" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <MonthPicker
          month={month}
          note={`${sessions.length} ${sessions.length === 1 ? "يوم" : "أيام"} حضور • ${total} مخدوم`}
        />

        {sessions.length === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            لسه مفيش أيام حضور مسجّلة في الشهر ده
          </p>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-bold text-slate-700">
                مين جه ومين ما جاش الشهر ده
              </h2>
              <SplitBar present={came} absent={never} />
              <p className="text-xs text-slate-500">
                &quot;حضروا&quot; يعني جه مرة واحدة على الأقل في أي حاجة خلال الشهر.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-bold text-slate-700">الحضور في كل يوم</h2>
              <BarChart data={perSession} max={total} unit={`/ ${total}`} />
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-bold text-slate-700">
                إجمالي الحضور لكل خانة
              </h2>
              <BarChart data={byField} unit="مرة" />
              <p className="text-xs text-slate-500">
                مجموع كل مرات الحضور على مدار {sessions.length}{" "}
                {sessions.length === 1 ? "يوم" : "أيام"}.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">
                كل فصل على حدة
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-right px-3 py-2 font-bold">الفصل</th>
                      <th className="px-2 py-2 font-bold">العدد</th>
                      <th className="px-2 py-2 font-bold">حضروا</th>
                      <th className="px-2 py-2 font-bold">ما جوش</th>
                      <th className="px-2 py-2 font-bold">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.flatMap((stage) =>
                      AREAS.map((area) => {
                        const inClass = students.filter(
                          (s) => s.stage === stage && s.area === area,
                        );
                        if (inClass.length === 0) return null;
                        const c = inClass.filter((s) => s.anyAttendance > 0).length;
                        const pct = Math.round((c / inClass.length) * 100);
                        return (
                          <tr
                            key={`${stage}-${area}`}
                            className="border-t border-slate-100 even:bg-slate-50/60"
                          >
                            <td className="px-3 py-2 font-bold whitespace-nowrap">
                              {stage} — {area}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                              {inClass.length}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums font-bold text-green-700">
                              {c}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums font-bold text-red-700">
                              {inClass.length - c}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                              {pct}%
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
