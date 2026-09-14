import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_FIELDS, SERVANT_FIELDS, formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

type SessionRow = { id: number; session_date: string; is_monthly_mass: boolean };

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_date, is_monthly_mass")
    .order("session_date", { ascending: false })
    .limit(15);

  const list = (sessions ?? []) as SessionRow[];

  if (list.length === 0) {
    return (
      <>
        <NavBar title="التقارير" back="/" />
        <main className="max-w-4xl mx-auto px-3 py-10 text-center text-slate-400">
          لسه مفيش أيام حضور مسجّلة
        </main>
      </>
    );
  }

  const ids = list.map((s) => s.id);

  const [studentRows, servantRows] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("session_id, mass, communion, service, tasbeha")
      .in("session_id", ids),
    supabase
      .from("servant_attendance")
      .select(
        "session_id, preparation, visitation, mass, communion, servants_meeting, family_meeting, service",
      )
      .in("session_id", ids),
  ]);

  function countBy<T extends Record<string, unknown>>(
    rows: T[] | null,
    sessionId: number,
    key: string,
  ) {
    return (rows ?? []).filter((r) => r.session_id === sessionId && r[key]).length;
  }

  return (
    <>
      <NavBar title="التقارير" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">المخدومين</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-3 py-2 font-bold">اليوم</th>
                {STUDENT_FIELDS.map((f) => (
                  <th key={f.key} className="px-2 py-2 font-bold whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 even:bg-slate-50/60">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/attendance/students?date=${s.session_date}`}
                      className="text-brand-700 font-bold hover:underline"
                    >
                      {formatArabicDate(s.session_date)}
                    </Link>
                    {s.is_monthly_mass && <span title="القداس الشهري" className="mr-1">⭐</span>}
                  </td>
                  {STUDENT_FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-2 text-center font-bold">
                      {countBy(studentRows.data, s.id, f.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">الخدام</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-3 py-2 font-bold">اليوم</th>
                {SERVANT_FIELDS.map((f) => (
                  <th key={f.key} className="px-2 py-2 font-bold whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 even:bg-slate-50/60">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/attendance/servants?date=${s.session_date}`}
                      className="text-brand-700 font-bold hover:underline"
                    >
                      {formatArabicDate(s.session_date)}
                    </Link>
                    {s.is_monthly_mass && <span title="القداس الشهري" className="mr-1">⭐</span>}
                  </td>
                  {SERVANT_FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-2 text-center font-bold">
                      {countBy(servantRows.data, s.id, f.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
