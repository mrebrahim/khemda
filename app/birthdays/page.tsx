import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, monthName, SERVICE_YEAR_MONTHS, serviceYearOf } from "@/lib/month";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  full_name: string;
  birth_date: string;
  area: string | null;
  stage: string | null;
};

export default async function BirthdaysPage() {
  const supabase = await createClient();
  const nowMonth = currentMonth();
  const thisMonth = Number(nowMonth.split("-")[1]);
  const { startYear, label: yearLabel } = serviceYearOf(nowMonth);

  const { data } = await supabase
    .from("students")
    .select("id, full_name, birth_date, classes(area, stage)")
    .eq("is_active", true)
    .not("birth_date", "is", null)
    .order("birth_date");

  const rows: Row[] = (data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      birth_date: s.birth_date as string,
      area: cls?.area ?? null,
      stage: cls?.stage ?? null,
    };
  });

  // تجميع بالشهر، وجوه الشهر بترتيب اليوم
  const byMonth = new Map<number, Row[]>();
  for (const r of rows) {
    const m = Number(r.birth_date.slice(5, 7));
    const list = byMonth.get(m) ?? [];
    list.push(r);
    byMonth.set(m, list);
  }
  for (const list of byMonth.values()) {
    list.sort((a, b) => a.birth_date.slice(8, 10).localeCompare(b.birth_date.slice(8, 10)));
  }

  const { count: totalActive } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const withDate = rows.length;
  const missing = (totalActive ?? 0) - withDate;

  return (
    <>
      <NavBar title="أعياد الميلاد" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="font-bold text-brand-900">سنة الخدمة {yearLabel}</p>
          <p className="text-xs text-slate-500 mt-1">
            الشهور مرتّبة من أكتوبر لسبتمبر • {withDate} مخدوم عندهم تاريخ ميلاد مسجّل
          </p>
        </div>

        {missing > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
            <p className="font-bold text-amber-900">
              ⚠️ {missing} مخدوم من غير تاريخ ميلاد
            </p>
            <p className="text-sm text-amber-800 mt-1.5 leading-relaxed">
              دول مش هيظهروا في القوائم تحت. تواريخ الميلاد دي كانت ناقصة في ملف
              الإكسل نفسه. تقدر تكمّلها من{" "}
              <Link href="/students" className="font-bold underline">
                بيانات المخدومين
              </Link>{" "}
              وهيظهروا هنا على طول.
            </p>
          </div>
        )}

        {SERVICE_YEAR_MONTHS.map((m) => {
          const list = byMonth.get(m) ?? [];
          // أكتوبر–ديسمبر في سنة البداية، يناير–سبتمبر في السنة اللي بعدها
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
                  {list.length}
                </span>
              </div>

              {list.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">مفيش أعياد ميلاد</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((r) => {
                    const day = Number(r.birth_date.slice(8, 10));
                    const birthYear = Number(r.birth_date.slice(0, 4));
                    const age = year - birthYear;
                    return (
                      <li
                        key={r.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/students/${r.id}`}
                            className="font-bold text-brand-900 hover:underline"
                          >
                            {r.full_name}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {[r.area, r.stage].filter(Boolean).join(" — ")}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-slate-800 tabular-nums">
                            {day} {monthName(m)}
                          </p>
                          <p className="text-xs text-slate-400">
                            بيكمّل {age} سنة
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
