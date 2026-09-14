import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_FIELDS, formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

type AttRow = {
  mass: boolean;
  communion: boolean;
  service: boolean;
  tasbeha: boolean;
  sessions: { session_date: string; is_monthly_mass: boolean } | null;
};

export default async function StudentProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, phone, father_phone, mother_phone, address, birth_date, confession_father, notes, classes(area, stage, saint_name)",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student) notFound();

  const cls = student.classes as unknown as {
    area: string;
    stage: string;
    saint_name: string | null;
  } | null;

  const { data: attendance } = await supabase
    .from("student_attendance")
    .select("mass, communion, service, tasbeha, sessions(session_date, is_monthly_mass)")
    .eq("student_id", studentId);

  const rows = ((attendance ?? []) as unknown as AttRow[])
    .filter((r) => r.sessions)
    .sort((a, b) =>
      b.sessions!.session_date.localeCompare(a.sessions!.session_date),
    );

  const totals = STUDENT_FIELDS.map(
    (f) => rows.filter((r) => r[f.key]).length,
  );
  const monthlyMassAttended = rows.filter(
    (r) => r.sessions!.is_monthly_mass && r.mass,
  ).length;

  const info: [string, string | null][] = [
    ["المنطقة", cls?.area ?? null],
    ["المرحلة", cls?.stage ?? null],
    ["قديس الفصل", cls?.saint_name ?? null],
    ["تليفون الطفل", student.phone],
    ["تليفون الأب", student.father_phone],
    ["تليفون الأم", student.mother_phone],
    ["تاريخ الميلاد", student.birth_date],
    ["أب الاعتراف", student.confession_father],
    ["العنوان", student.address],
    ["ملاحظات", student.notes],
  ];

  return (
    <>
      <NavBar title={student.full_name} back="/students" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        {/* ملخص الحضور */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-700 mb-3">ملخص الحضور</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STUDENT_FIELDS.map((f, i) => (
              <Stat key={f.key} label={f.label} value={totals[i]} total={rows.length} />
            ))}
            <Stat label="القداس الشهري" value={monthlyMassAttended} highlight />
          </div>
        </section>

        {/* البيانات */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">البيانات</h2>
          <dl className="divide-y divide-slate-100">
            {info
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-slate-500 w-28 shrink-0">{k}</dt>
                  <dd className="font-bold text-slate-800 grow break-words">
                    {k.startsWith("تليفون") ? (
                      <a href={`tel:${v}`} dir="ltr" className="text-brand-700 hover:underline">
                        {v}
                      </a>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </section>

        {/* السجل */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">سجل الحضور</h2>
          {rows.length === 0 ? (
            <p className="text-center text-slate-400 py-8">لسه مفيش حضور مسجّل</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-3 py-2 font-bold">التاريخ</th>
                  {STUDENT_FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-2 font-bold whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.sessions!.session_date}
                    className="border-t border-slate-100 even:bg-slate-50/60"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatArabicDate(r.sessions!.session_date)}
                      {r.sessions!.is_monthly_mass && (
                        <span title="القداس الشهري" className="mr-1">⭐</span>
                      )}
                    </td>
                    {STUDENT_FIELDS.map((f) => (
                      <td key={f.key} className="px-2 py-2 text-center text-lg">
                        {r[f.key] ? "✅" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  total,
  highlight,
}: {
  label: string;
  value: number;
  total?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${
        highlight ? "bg-amber-50 border border-amber-200" : "bg-slate-50"
      }`}
    >
      <p className="text-2xl font-bold text-brand-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {total !== undefined && total > 0 && (
        <p className="text-[11px] text-slate-400">
          من {total} ({Math.round((value / total) * 100)}%)
        </p>
      )}
    </div>
  );
}
