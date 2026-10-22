import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600 border-slate-300" },
  active: { label: "شغّال دلوقتي", cls: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  ended: { label: "خلص", cls: "bg-slate-100 text-slate-500 border-slate-300" },
  cancelled: { label: "ملغي", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function LuckyPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: attempts }, { data: claims }] = await Promise.all([
    supabase
      .from("lucky_events")
      .select("id, title, status, created_at, max_attempts, require_attendance")
      .order("id", { ascending: false }),
    supabase.from("lucky_attempts").select("event_id"),
    supabase.from("lucky_claims").select("event_id, status"),
  ]);

  const openedOf = new Map<number, number>();
  for (const a of attempts ?? []) {
    openedOf.set(a.event_id, (openedOf.get(a.event_id) ?? 0) + 1);
  }
  const pendingOf = new Map<number, number>();
  for (const c of claims ?? []) {
    if (c.status !== "pending") continue;
    pendingOf.set(c.event_id, (pendingOf.get(c.event_id) ?? 0) + 1);
  }

  const pendingTotal = (claims ?? []).filter((c) => c.status === "pending").length;

  return (
    <>
      <NavBar title="صندوق الحظ" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">🎁 صندوق الحظ الأسطوري</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            تعمل حدث، تشغّله في الاجتماع، وتعرض الكود على موبايلك أو الشاشة.
            كل ولد يمسحه بيفتح صندوق واحد وياخد مكافأته على طول.
          </p>
          {pendingTotal > 0 && (
            <p className="mt-2 text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⏳ في {pendingTotal} جايزة لسه ما اتسلّمتش
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-3">حدث جديد</h3>
          <form action={createEvent} className="space-y-3">
            <input
              name="title"
              required
              maxLength={80}
              placeholder="اسم الحدث — زي: صندوق الجمعة الأسطوري"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">عدد الفتحات للولد</span>
                <input
                  name="max_attempts"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={1}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">أقل مستوى (اختياري)</span>
                <input
                  name="min_level"
                  type="number"
                  min={0}
                  max={12}
                  defaultValue={0}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            {/* مقفول من الأول: الولد يفتح بكود الطالب بتاعه على
                طول. اللي عايز يربطه بالحضور يعلّمه هنا أو من
                صفحة الحدث. */}
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" name="require_attendance" className="w-4 h-4 mt-0.5" />
              <span>
                لازم يكون حضوره متسجّل النهارده
                <span className="block text-[11px] text-slate-500">
                  سيبها فاضية عشان أي ولد بكود الطالب يفتح على طول
                </span>
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-600 text-white font-bold py-2.5 hover:bg-brand-700 transition"
            >
              اعمل الحدث
            </button>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              الحدث بيتعمل كمسودة ومعاه مجموعة جوايز جاهزة تقدر تعدّلها،
              وما بيشتغلش غير لما تدوس «شغّل».
            </p>
          </form>
        </section>

        {(events ?? []).length === 0 && (
          <p className="text-center text-slate-500 py-8">لسه مفيش أحداث.</p>
        )}

        {(events ?? []).map((e) => {
          const s = STATUS[e.status] ?? STATUS.draft;
          return (
            <Link
              key={e.id}
              href={`/lucky/${e.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-400 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-brand-900 truncate">{e.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    فتحوا <span className="font-bold tabular-nums">{openedOf.get(e.id) ?? 0}</span>{" "}
                    صندوق
                    {(pendingOf.get(e.id) ?? 0) > 0 && (
                      <span className="text-amber-700 font-bold">
                        {" • "}
                        {pendingOf.get(e.id)} جايزة للتسليم
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-bold border rounded-full px-2 py-1 ${s.cls}`}>
                  {s.label}
                </span>
              </div>
            </Link>
          );
        })}
      </main>
    </>
  );
}
