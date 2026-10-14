import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { STAGES, AREAS } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import { markPrinted } from "./actions";

export const dynamic = "force-dynamic";

type Card = {
  student_id: number;
  login_code: string;
  initial_pin: string | null;
  full_name: string;
  area: string | null;
  stage: string | null;
};

export default async function CardsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_accounts")
    .select("student_id, login_code, initial_pin, students(full_name, classes(area, stage))")
    .eq("is_active", true);

  const cards: Card[] = (data ?? []).map((a) => {
    const st = a.students as unknown as {
      full_name: string;
      classes: { area: string; stage: string } | null;
    } | null;
    return {
      student_id: a.student_id,
      login_code: a.login_code,
      initial_pin: a.initial_pin,
      full_name: st?.full_name ?? "",
      area: st?.classes?.area ?? null,
      stage: st?.classes?.stage ?? null,
    };
  });

  const pending = cards.filter((c) => c.initial_pin).length;

  const ordered = [...cards].sort(
    (a, b) =>
      STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) ||
      AREAS.indexOf(a.area as never) - AREAS.indexOf(b.area as never) ||
      a.full_name.localeCompare(b.full_name, "ar"),
  );

  return (
    <>
      <div className="print:hidden">
        <NavBar title="كروت الأبطال" back="/" />
      </div>

      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 print:hidden">
          <h2 className="font-bold text-slate-800">
            {cards.length} كارت • {pending} لسه ما اتوزّعوش
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            كل مخدوم ليه كود ورقم سري. اطبع الصفحة، قص الكروت، ووزّعها.
            بعد ما توزّعها اضغط الزرار تحت عشان الأرقام السرية تتمسح من
            قاعدة البيانات — بعد كده محدش هيقدر يشوفها، حتى إنت.
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            <PrintButton />

            {pending > 0 && (
              <form action={markPrinted}>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-200 text-slate-800 px-4 py-2 font-bold hover:bg-slate-300 transition"
                >
                  ✅ وزّعتها — امسح الأرقام السرية
                </button>
              </form>
            )}
          </div>

          {pending === 0 && (
            <p className="mt-3 text-sm bg-green-50 border border-green-300 rounded-xl px-3 py-2 text-green-800">
              الأرقام السرية اتمسحت. لو مخدوم نسي رقمه، المشرف يعمله واحد جديد.
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {ordered.map((c) => (
            <div
              key={c.student_id}
              className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white break-inside-avoid"
            >
              <p className="font-bold text-sm truncate" title={c.full_name}>
                {c.full_name}
              </p>
              <p className="text-[10px] text-slate-400 mb-2">
                {[c.area, c.stage].filter(Boolean).join(" — ")}
              </p>

              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-500">كود البطل</p>
                <p className="font-bold text-lg tracking-widest" dir="ltr">
                  {c.login_code}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">الرقم السري</p>
                <p className="font-bold text-lg tracking-widest" dir="ltr">
                  {c.initial_pin ?? "••••"}
                </p>
              </div>

              <p className="text-[9px] text-slate-400 text-center mt-1.5">
                أبطال المهمة
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
