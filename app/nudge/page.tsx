import NavBar from "@/components/NavBar";
import CopyBox from "@/components/CopyBox";
import { createClient } from "@/lib/supabase/server";
import { daysBetween, shiftDate } from "@/lib/habits";
import { getBaseUrl } from "@/lib/site";
import { STAGES, AREAS, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  full_name: string;
  phone: string | null;
  father_phone: string | null;
  area: string;
  stage: string;
  streak: number;
  idle: number;
  servants: string[];
};

/** واتساب عايز الرقم بالصيغة الدولية من غير صفر */
function waLink(phone: string | null, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const intl = digits.startsWith("20") ? digits : `20${digits.replace(/^0+/, "")}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export default async function NudgePage() {
  const today = todayISO();
  const base = await getBaseUrl();
  const supabase = await createClient();

  const [{ data: students }, { data: streaks }, { data: servantRows }, { data: active }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, phone, father_phone, class_id, classes(area, stage)")
        .eq("is_active", true),
      supabase
        .from("student_streaks")
        .select("student_id, current_streak, last_active_on"),
      supabase.from("servants").select("full_name, class_id").eq("is_active", true),
      supabase.from("daily_missions").select("student_id").eq("on_date", today),
    ]);

  const servantsOf = new Map<number, string[]>();
  for (const s of servantRows ?? []) {
    if (s.class_id == null) continue;
    servantsOf.set(s.class_id, [...(servantsOf.get(s.class_id) ?? []), s.full_name]);
  }
  const streakOf = new Map((streaks ?? []).map((s) => [s.student_id, s]));
  const doneToday = new Set((active ?? []).map((a) => a.student_id));

  const rows: Row[] = (students ?? [])
    .map((st) => {
      const cls = st.classes as unknown as { area: string; stage: string } | null;
      const s = streakOf.get(st.id);
      return {
        id: st.id,
        full_name: st.full_name,
        phone: st.phone,
        father_phone: st.father_phone,
        area: cls?.area ?? "",
        stage: cls?.stage ?? "",
        streak: s?.current_streak ?? 0,
        idle: s?.last_active_on ? daysBetween(s.last_active_on, today) : 999,
        servants: servantsOf.get(st.class_id) ?? [],
      };
    })
    .filter((r) => !doneToday.has(r.id));

  const byName = (a: Row, b: Row) =>
    STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) ||
    AREAS.indexOf(a.area as never) - AREAS.indexOf(b.area as never) ||
    a.full_name.localeCompare(b.full_name, "ar");

  // سلسلته على وشك تقطع — دول الأولوية
  const atRisk = rows
    .filter((r) => r.streak >= 2 && r.idle === 1)
    .sort((a, b) => b.streak - a.streak);
  // غايب ٣ أيام أو أكتر
  const gone = rows.filter((r) => r.idle >= 3 && r.idle < 999).sort((a, b) => a.idle - b.idle);
  // عمره ما بدأ
  const never = rows.filter((r) => r.idle === 999).sort(byName);

  const listText = (list: Row[]) =>
    list
      .map(
        (r) =>
          `${r.full_name} — ${r.area} ${r.stage}${
            r.servants.length ? ` — خادمه: ${r.servants.join(" • ")}` : ""
          }`,
      )
      .join("\n");

  return (
    <>
      <NavBar title="تذكير الأبطال" back="/" />

      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">مين محتاج تخبط له النهارده؟</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            تنبيهات الموبايل بتوصل للولاد اللي شغّلوها من موبايلهم بس. الصفحة
            دي بتوريك مين محتاج رسالة واتساب منك إنت — والرسالة جاهزة، تدوس
            وتبعت.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            القوايم بتتحدّث لوحدها، واللي عمل مهمة النهارده بيختفي منها.
          </p>
        </section>

        <Group
          title="🚨 سلسلتهم هتقطع النهارده"
          note="دول الأهم — فاضلهم ساعات"
          rows={atRisk}
          color="#dc2626"
          msg={(r) =>
            `سلام ونعمة يا ${r.full_name.split(" ")[0]} 👋\nسلسلتك في أبطال المهمة ${r.streak} يوم ورا بعض 🔥\nمهمة واحدة بس النهارده وتفضل مكمّلة — دقيقة وتخلص:\n${base}/hero`
          }
          listText={listText}
        />

        <Group
          title="😢 بقالهم ٣ أيام أو أكتر"
          note="محتاجين رسالة ترجّعهم"
          rows={gone}
          color="#d97706"
          msg={(r) =>
            `سلام ونعمة يا ${r.full_name.split(" ")[0]} 👋\nوحشتنا في أبطال المهمة! بقالك ${r.idle} يوم مادخلتش.\nابدأ سلسلة جديدة النهارده ونقطك كلها مستنياك:\n${base}/hero`
          }
          listText={listText}
        />

        <Group
          title="🆕 لسه مابدأوش خالص"
          note="محتاجين حد يفهّمهم اللعبة"
          rows={never}
          color="#475569"
          msg={(r) =>
            `سلام ونعمة يا ${r.full_name.split(" ")[0]} 👋\nفيه لعبة اسمها «أبطال المهمة» — بتجمع نقط من الحضور والمهمات اليومية، وتطلع ليفل وتاخد جوايز حقيقية 🎁\nادخل بالكود اللي على كارتك وجرّب:\n${base}/hero`
          }
          listText={listText}
        />
      </main>
    </>
  );
}

function Group({
  title,
  note,
  rows,
  color,
  msg,
  listText,
}: {
  title: string;
  note: string;
  rows: Row[];
  color: string;
  msg: (r: Row) => string;
  listText: (rows: Row[]) => string;
}) {
  if (rows.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-emerald-700 mt-1.5">مفيش حد هنا دلوقتي 👏</p>
      </section>
    );
  }

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 border-r-4 p-4"
      style={{ borderRightColor: color }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-800">
          {title} <span className="text-sm font-normal text-slate-500">({rows.length})</span>
        </h3>
        <span className="text-xs text-slate-500">{note}</span>
      </div>

      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map((r) => {
          const text = msg(r);
          const own = waLink(r.phone, text);
          const dad = waLink(r.father_phone, text);
          const link = own ?? dad;
          return (
            <li key={r.id} className="py-2.5 flex items-center gap-2">
              <span className="grow min-w-0">
                <span className="block font-bold text-slate-800 text-sm truncate">
                  {r.full_name}
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  {[r.area, r.stage].filter(Boolean).join(" • ")}
                  {r.servants.length > 0 && ` • خادمه: ${r.servants.join(" • ")}`}
                </span>
              </span>

              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  {own ? "واتساب" : "واتساب والده"}
                </a>
              ) : (
                <span className="shrink-0 text-[11px] text-slate-400">مفيش رقم</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <CopyBox text={listText(rows)} />
      </div>
    </section>
  );
}
