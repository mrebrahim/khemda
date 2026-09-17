import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, monthName, SERVICE_YEAR_MONTHS, serviceYearOf } from "@/lib/month";
import { servantsGateState } from "@/lib/servants-gate";

export const dynamic = "force-dynamic";

type Person = {
  id: number;
  full_name: string;
  birth_date: string;
  label: string;
  phone: string | null;
  kind: "servant" | "student";
};

export default async function BirthdaysPage() {
  const supabase = await createClient();
  const nowMonth = currentMonth();
  const thisMonth = Number(nowMonth.split("-")[1]);
  const { startYear, label: yearLabel } = serviceYearOf(nowMonth);

  // أعياد ميلاد الخدام جزء من سكشن الخدام، فبتتقفل بنفس الكود
  const servantsUnlocked = (await servantsGateState()) === "open";

  const [servantsRes, studentsRes, servantTotal, studentTotal] = await Promise.all([
    servantsUnlocked
      ? supabase
          .from("servants")
          .select("id, full_name, birth_date, phone, classes(area, stage)")
          .eq("is_active", true)
          .not("birth_date", "is", null)
      : Promise.resolve({ data: null }),
    supabase
      .from("students")
      .select("id, full_name, birth_date, phone, father_phone, classes(area, stage)")
      .eq("is_active", true)
      .not("birth_date", "is", null),
    supabase.from("servants").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const servants: Person[] = (servantsRes.data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      birth_date: s.birth_date as string,
      label: [cls?.area, cls?.stage].filter(Boolean).join(" — ") || "الفصل مش متحدّد",
      phone: s.phone,
      kind: "servant" as const,
    };
  });

  const students: Person[] = (studentsRes.data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      birth_date: s.birth_date as string,
      label: [cls?.area, cls?.stage].filter(Boolean).join(" — "),
      phone: s.father_phone ?? s.phone,
      kind: "student" as const,
    };
  });

  const byMonth = new Map<number, { servants: Person[]; students: Person[] }>();
  for (const p of [...servants, ...students]) {
    const m = Number(p.birth_date.slice(5, 7));
    const slot = byMonth.get(m) ?? { servants: [], students: [] };
    (p.kind === "servant" ? slot.servants : slot.students).push(p);
    byMonth.set(m, slot);
  }
  const byDay = (a: Person, b: Person) => a.birth_date.slice(8, 10).localeCompare(b.birth_date.slice(8, 10));
  for (const slot of byMonth.values()) {
    slot.servants.sort(byDay);
    slot.students.sort(byDay);
  }

  const missingStudents = (studentTotal.count ?? 0) - students.length;
  const missingServants = servantsUnlocked
    ? (servantTotal.count ?? 0) - servants.length
    : 0;

  return (
    <>
      <NavBar title="أعياد الميلاد" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="font-bold text-brand-900">سنة الخدمة {yearLabel}</p>
          <p className="text-xs text-slate-500 mt-1">
            من أكتوبر لسبتمبر • الخدام الأول وبعدين المخدومين
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {servantsUnlocked && <>🙌 {servants.length} خادم • </>}
            🧒 {students.length} مخدوم عندهم تاريخ ميلاد
          </p>
        </div>

        {!servantsUnlocked && (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 text-center text-sm">
            🔒 أعياد ميلاد الخدام مقفولة — افتح{" "}
            <Link href="/attendance/servants" className="font-bold text-brand-700 hover:underline">
              سكشن الخدام
            </Link>{" "}
            بالكود السري عشان تشوفها مع المخدومين
          </div>
        )}

        {(missingStudents > 0 || missingServants > 0) && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm">
            <p className="font-bold text-amber-900">⚠️ ناقص تواريخ ميلاد</p>
            <p className="text-amber-800 mt-1.5 leading-relaxed">
              {missingServants > 0 && <>{missingServants} خادم و</>}
              {missingStudents} مخدوم ملهمش تاريخ ميلاد، فمش هيظهروا تحت. تقدر
              تكمّلهم من{" "}
              <Link href="/students" className="font-bold underline">
                بيانات المخدومين
              </Link>
              .
            </p>
          </div>
        )}

        {SERVICE_YEAR_MONTHS.map((m) => {
          const slot = byMonth.get(m) ?? { servants: [], students: [] };
          const count = slot.servants.length + slot.students.length;
          const year = m >= 10 ? startYear : startYear + 1;
          const isNow = m === thisMonth;

          return (
            <section
              key={m}
              className={`bg-white rounded-2xl border overflow-hidden ${
                isNow ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200"
              }`}
            >
              <div
                className={`px-4 py-2.5 flex items-center justify-between gap-2 ${
                  isNow ? "bg-brand-50" : "bg-slate-50"
                }`}
              >
                <p className="font-bold text-slate-800">
                  {isNow && "🎂 "}
                  {monthName(m)} {year}
                  {isNow && (
                    <span className="text-xs font-normal text-brand-700 mr-2">
                      (الشهر الحالي)
                    </span>
                  )}
                </p>
                <span className="text-sm font-bold text-slate-600 tabular-nums shrink-0">
                  {count}
                </span>
              </div>

              {count === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">مفيش أعياد ميلاد</p>
              ) : (
                <>
                  {slot.servants.length > 0 && (
                    <Group
                      title={`🙌 الخدام (${slot.servants.length})`}
                      people={slot.servants}
                      month={m}
                      year={year}
                      hrefBase={null}
                    />
                  )}
                  {slot.students.length > 0 && (
                    <Group
                      title={`🧒 المخدومين (${slot.students.length})`}
                      people={slot.students}
                      month={m}
                      year={year}
                      hrefBase="/students"
                    />
                  )}
                </>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}

function Group({
  title,
  people,
  month,
  year,
  hrefBase,
}: {
  title: string;
  people: Person[];
  month: number;
  year: number;
  hrefBase: string | null;
}) {
  return (
    <>
      <p className="px-4 pt-3 pb-1 text-xs font-bold text-slate-500">{title}</p>
      <ul className="divide-y divide-slate-100">
        {people.map((p) => {
          const day = Number(p.birth_date.slice(8, 10));
          const age = year - Number(p.birth_date.slice(0, 4));
          return (
            <li key={`${p.kind}-${p.id}`} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {hrefBase ? (
                  <Link
                    href={`${hrefBase}/${p.id}`}
                    className="font-bold text-brand-900 hover:underline"
                  >
                    {p.full_name}
                  </Link>
                ) : (
                  <span className="font-bold text-brand-900">{p.full_name}</span>
                )}
                <p className="text-xs text-slate-400">
                  {p.label}
                  {p.phone && (
                    <>
                      {" • "}
                      <a href={`tel:${p.phone}`} dir="ltr" className="text-brand-600 hover:underline">
                        {p.phone}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="text-left shrink-0">
                <p className="font-bold text-slate-800 tabular-nums">
                  {day} {monthName(month)}
                </p>
                <p className="text-xs text-slate-400">بيكمّل {age} سنة</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
