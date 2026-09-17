import Link from "next/link";
import NavBar from "@/components/NavBar";
import MonthPicker from "@/components/MonthPicker";
import { getStudentsMonth, type StudentMonth } from "@/lib/reports";
import { currentMonth, isValidMonth, formatMonth } from "@/lib/month";
import { STAGES, AREAS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 0 مرات = خطر، مرة واحدة = تحذير */
function level(count: number): "critical" | "warning" | null {
  if (count === 0) return "critical";
  if (count === 1) return "warning";
  return null;
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = isValidMonth(raw) ? raw : currentMonth();

  const { sessions, students } = await getStudentsMonth(month);

  // التحذير بيطلع لو القداس أو الخدمة مرة واحدة أو أقل
  const flagged = students.filter(
    (s) => level(s.mass) !== null || level(s.service) !== null,
  );

  const note =
    sessions.length === 0
      ? "لسه مفيش أيام حضور مسجّلة في الشهر ده"
      : `${sessions.length} ${sessions.length === 1 ? "يوم" : "أيام"} حضور مسجّلة`;

  return (
    <>
      <NavBar title="تحذيرات الغياب" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <MonthPicker month={month} note={note} />

        {sessions.length === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            سجّل الحضور الأول عشان تقدر تشوف التحذيرات
          </p>
        ) : flagged.length === 0 ? (
          <p className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center font-bold text-green-800">
            ✅ مفيش تحذيرات في {formatMonth(month)} — كله منتظم
          </p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="font-bold text-slate-800">
                {flagged.length} مخدوم محتاجين متابعة
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                التحذير بيطلع لو المخدوم حضر القداس أو الخدمة{" "}
                <b>مرة واحدة بس أو ما حضرش خالص</b> خلال الشهر
                {" "}({sessions.length} {sessions.length === 1 ? "يوم" : "أيام"}).
              </p>
            </div>

            {STAGES.map((stage) => {
              const inStage = flagged.filter((s) => s.stage === stage);
              if (inStage.length === 0) return null;

              return (
                <section key={stage} className="space-y-2">
                  <h2 className="font-bold text-lg text-brand-900 px-1">
                    {stage}{" "}
                    <span className="text-sm font-normal text-slate-500">
                      ({inStage.length})
                    </span>
                  </h2>

                  {AREAS.map((area) => {
                    const inArea = inStage.filter((s) => s.area === area);
                    if (inArea.length === 0) return null;
                    return (
                      <AreaBlock key={area} area={area} students={inArea} />
                    );
                  })}
                </section>
              );
            })}
          </>
        )}
      </main>
    </>
  );
}

function AreaBlock({ area, students }: { area: string; students: StudentMonth[] }) {
  const servants = students[0]?.servants ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <p className="font-bold text-slate-800">{area}</p>
        {servants.length > 0 && (
          <p className="text-xs text-slate-600 mt-0.5">
            الخادم: <b>{servants.join(" • ")}</b>
          </p>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {students.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Link
                  href={`/students/${s.id}`}
                  className="font-bold text-brand-900 hover:underline"
                >
                  {s.full_name}
                </Link>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Badge label="القداس" count={s.mass} />
                  <Badge label="الخدمة" count={s.service} />
                </div>
              </div>

              {(s.father_phone || s.phone) && (
                <a
                  href={`tel:${s.father_phone ?? s.phone}`}
                  dir="ltr"
                  className="text-sm font-bold text-brand-700 hover:underline shrink-0"
                >
                  📞 {s.father_phone ?? s.phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ label, count }: { label: string; count: number }) {
  const lv = level(count);
  if (lv === null) {
    return (
      <span className="text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-600">
        {label}: {count}
      </span>
    );
  }

  // اللون مش لوحده — معاه أيقونة ونص
  const isCritical = lv === "critical";
  return (
    <span
      className={`text-xs font-bold rounded-full px-2.5 py-1 border ${
        isCritical
          ? "bg-red-50 text-red-800 border-red-300"
          : "bg-amber-50 text-amber-900 border-amber-300"
      }`}
    >
      {isCritical ? "🔴" : "🟠"} {label}:{" "}
      {isCritical ? "ما حضرش خالص" : "مرة واحدة بس"}
    </span>
  );
}
