import Link from "next/link";
import NavBar from "@/components/NavBar";
import CopyBox from "@/components/CopyBox";
import AbsentDateBar from "@/components/AbsentDateBar";
import { createClient } from "@/lib/supabase/server";
import { getClassServants, stageRank, areaRank } from "@/lib/reports";
import { STAGES, AREAS, todayISO, formatArabicDate, STUDENT_FIELDS } from "@/lib/types";

export const dynamic = "force-dynamic";

const CRITERIA = [
  { key: "any", label: "أي حاجة" },
  ...STUDENT_FIELDS.map((f) => ({ key: f.key as string, label: f.label })),
] as const;

type Absent = {
  id: number;
  full_name: string;
  area: string | null;
  stage: string | null;
  class_id: number;
};

/** أرقام عربية للترقيم في النص */
function ar(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default async function AbsentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; by?: string }>;
}) {
  const { date: rawDate, by: rawBy } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate! : todayISO();
  const by = CRITERIA.some((c) => c.key === rawBy) ? rawBy! : "any";
  const criterionLabel = CRITERIA.find((c) => c.key === by)!.label;

  const supabase = await createClient();
  const servantsByClass = await getClassServants();

  const [{ data: session }, { data: studentRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id")
      .eq("session_date", date)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id, full_name, class_id, classes(area, stage)")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  // مين حضر: لو المعيار "أي حاجة" يبقى أي خانة متعلّمة، وإلا الخانة المحدّدة
  const present = new Set<number>();
  if (session) {
    const { data: att } = await supabase
      .from("student_attendance")
      .select("student_id, mass, communion, service, tasbeha")
      .eq("session_id", session.id);

    for (const r of att ?? []) {
      const came =
        by === "any"
          ? r.mass || r.communion || r.service || r.tasbeha
          : Boolean(r[by as "mass" | "communion" | "service" | "tasbeha"]);
      if (came) present.add(r.student_id);
    }
  }

  const absent: Absent[] = (studentRows ?? [])
    .map((s) => {
      const cls = s.classes as unknown as { area: string; stage: string } | null;
      return {
        id: s.id,
        full_name: s.full_name,
        class_id: s.class_id,
        area: cls?.area ?? null,
        stage: cls?.stage ?? null,
      };
    })
    .filter((s) => !present.has(s.id))
    .sort(
      (a, b) =>
        stageRank(a.stage) - stageRank(b.stage) ||
        areaRank(a.area) - areaRank(b.area) ||
        a.full_name.localeCompare(b.full_name, "ar"),
    );

  const totalStudents = studentRows?.length ?? 0;
  const dateLabel = formatArabicDate(date);

  // نبني بلوك نص لكل فصل، وبعدين نجمّعهم كلهم في نص واحد
  const blocks: { key: string; heading: string; servants: string; text: string; count: number }[] = [];

  for (const stage of STAGES) {
    for (const area of AREAS) {
      const group = absent.filter((s) => s.stage === stage && s.area === area);
      if (group.length === 0) continue;

      const servants = servantsByClass.get(group[0].class_id) ?? [];
      const heading = `${stage} — ${area}`;
      const servantLine = servants.length > 0 ? servants.join(" • ") : "مفيش خادم متسجّل";

      const lines = [
        `غياب ${dateLabel}`,
        `${heading}`,
        `الخادم: ${servantLine}`,
        `عدد الغياب: ${ar(group.length)}`,
        "",
        ...group.map((s, i) => `${ar(i + 1)}. ${s.full_name}`),
      ];

      blocks.push({
        key: `${stage}-${area}`,
        heading,
        servants: servantLine,
        text: lines.join("\n"),
        count: group.length,
      });
    }
  }

  const fullText = [
    `غياب ${dateLabel}`,
    `الحضور محسوب على: ${criterionLabel}`,
    `إجمالي الغياب: ${ar(absent.length)} من ${ar(totalStudents)}`,
    "",
    ...blocks.flatMap((b) => [
      "──────────",
      b.heading,
      `الخادم: ${b.servants}`,
      `عدد الغياب: ${ar(b.count)}`,
      "",
      ...b.text.split("\n").slice(5),
      "",
    ]),
  ].join("\n");

  return (
    <>
      <NavBar title="غياب النهارده" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <AbsentDateBar date={date} by={by} criteria={CRITERIA} />

        {!session ? (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-center">
            <p className="font-bold text-amber-900">
              مفيش حضور مسجّل في اليوم ده
            </p>
            <p className="text-sm text-amber-800 mt-2">
              يعني كل الـ{ar(totalStudents)} مخدوم هيطلعوا غايبين. سجّل الحضور
              الأول من{" "}
              <Link
                href={`/attendance/students?date=${date}`}
                className="font-bold underline"
              >
                حضور المخدومين
              </Link>
              .
            </p>
          </div>
        ) : absent.length === 0 ? (
          <p className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center font-bold text-green-800">
            ✅ مفيش غياب — كله حضر
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="font-bold text-slate-800">
              {ar(absent.length)} غايب من {ar(totalStudents)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              الحضور محسوب على: <b>{criterionLabel}</b>
            </p>
          </div>
        )}

        {blocks.length > 0 && (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-bold text-slate-700">
                الكشف كامل — انسخه مرة واحدة
              </h2>
              <CopyBox text={fullText} label="انسخ الكشف كله" />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold text-slate-700 px-1">
                كل فصل لوحده — ابعته للخادم على طول
              </h2>

              {blocks.map((b) => (
                <div
                  key={b.key}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">
                        {b.heading}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          ({ar(b.count)} غايب)
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        الخادم: <b>{b.servants}</b>
                      </p>
                    </div>
                    <CopyBox text={b.text} label="انسخ" compact />
                  </div>
                  <pre className="px-4 py-3 text-sm whitespace-pre-wrap font-sans leading-relaxed text-slate-700">
                    {b.text.split("\n").slice(5).join("\n")}
                  </pre>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
