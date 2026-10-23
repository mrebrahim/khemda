import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_FIELDS, formatArabicDate } from "@/lib/types";
import { getRanks, rankFor, getActiveSeason } from "@/lib/xp";
import { ensureStudentAccount } from "@/lib/student-code";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/site";
import Link from "next/link";
import XpReportView from "@/components/XpReport";
import { xpReport } from "@/lib/xp-report";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { added, saved } = await searchParams;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, phone, father_phone, mother_phone, address, birth_date, confession_father, notes, is_active, classes(area, stage, saint_name)",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student) notFound();

  const cls = student.classes as unknown as {
    area: string;
    stage: string;
    saint_name: string | null;
  } | null;

  // الكود بيتعمل لو مش موجود — فأي مخدوم تفتح صفحته يبقى معاه كود وQR
  const [ranks, season, account, baseUrl] = await Promise.all([
    getRanks(),
    getActiveSeason(),
    ensureStudentAccount(studentId),
    getBaseUrl(),
  ]);
  const loginCode = account.ok ? account.code : null;
  const qr = loginCode
    ? await qrDataUrl(`${baseUrl}/hero/enter?c=${loginCode}`, 260)
    : null;
  const { data: xpRows } = season
    ? await supabase
        .from("xp_ledger")
        .select("xp, is_verified")
        .eq("student_id", studentId)
        .eq("season_id", season.id)
    : { data: [] };

  const report = await xpReport(studentId, season?.id ?? null);
  const totalXp = (xpRows ?? []).reduce((n, r) => n + r.xp, 0);
  const verifiedXp = (xpRows ?? [])
    .filter((r) => r.is_verified)
    .reduce((n, r) => n + r.xp, 0);
  const rank = rankFor(totalXp, ranks);

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
        {saved === "1" && (
          <p className="bg-green-50 border border-green-300 text-green-800 rounded-2xl px-4 py-3 font-bold text-center">
            ✅ البيانات اتحفظت
          </p>
        )}

        {!student.is_active && (
          <p className="bg-slate-100 border border-slate-300 text-slate-700 rounded-2xl px-4 py-3 text-sm text-center">
            ⏸️ المخدوم ده موقوف — مش ظاهر في كشوف الحضور ولا بيقدر يدخل اللعبة.
          </p>
        )}

        <div className="flex justify-end">
          <Link
            href={`/students/${studentId}/edit`}
            className="rounded-xl bg-brand-600 text-white font-bold px-4 py-2.5 hover:bg-brand-700 transition"
          >
            ✏️ عدّل البيانات
          </Link>
        </div>
        {added === "1" && (
          <p className="bg-green-50 border border-green-300 text-green-800 rounded-2xl px-4 py-3 font-bold text-center">
            ✅ اتضاف المخدوم، وهيظهر في كشف الحضور على طول — وده كوده والـQR بتاعه
          </p>
        )}

        {/* كود الدخول والـQR */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800 mb-3">🎫 كارت البطل</h2>

          {loginCode ? (
            <div className="flex items-center gap-4 flex-wrap">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt={`كود ${student.full_name}`}
                  width={260}
                  height={260}
                  className="w-32 h-32 border border-slate-200 rounded-xl"
                />
              )}

              <div className="grow min-w-[150px]">
                <p className="text-xs text-slate-500">كود الدخول</p>
                <p
                  className="font-bold text-3xl tracking-[0.25em] text-slate-900 tabular-nums"
                  dir="ltr"
                >
                  {loginCode}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  الولد يمسح الـQR بكاميرا الموبايل فيدخل اللعبة على طول،
                  أو يكتب الكود في صفحة الدخول.
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Link
                    href={`/admin/cards?stage=${encodeURIComponent(cls?.stage ?? "")}&area=${encodeURIComponent(cls?.area ?? "")}`}
                    className="text-xs font-bold bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 transition"
                  >
                    اطبع كارت فصله
                  </Link>
                  <a
                    href={qr ?? "#"}
                    download={`${student.full_name}.png`}
                    className="text-xs font-bold border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:border-brand-400 transition"
                  >
                    نزّل الـQR صورة
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              مقدرناش نعمل كود للمخدوم ده: {account.ok ? "" : account.error}
            </p>
          )}
        </section>

        {/* النقاط والرتبة */}
        {season && (
          <section className="g-bg g-card text-white p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold">LEVEL {String(rank.current?.level ?? 1).padStart(2, "0")}</p>
                <p className="font-bold text-lg">{rank.current?.name ?? "—"}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-2xl tabular-nums">{totalXp}</p>
                <p className="text-xs opacity-80">
                  XP ({verifiedXp} موثقة)
                </p>
              </div>
            </div>

            <div className="mt-3">
              <span className="block h-2 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-white"
                  style={{ width: `${rank.progress}%` }}
                />
              </span>
              <p className="text-xs opacity-80 mt-1.5">
                {rank.next
                  ? `فاضل ${rank.toNext} نقطة على رتبة ${rank.next.name}`
                  : "وصل لأعلى رتبة في الموسم"}
              </p>
            </div>
          </section>
        )}

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

        {/* تقرير النقط: خد كام وعلى إيه ويوم إيه */}
        <XpReportView report={report} />

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
