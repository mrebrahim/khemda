import NavBar from "@/components/NavBar";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { STAGES, AREAS } from "@/lib/types";

export const dynamic = "force-dynamic";

type Card = {
  student_id: number;
  login_code: string;
  token: string;
  qr: string;
  full_name: string;
  area: string | null;
  stage: string | null;
  servants: string[];
};

export default async function CardsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: tokens }, { data: servantRows }] = await Promise.all([
    supabase
      .from("student_accounts")
      .select("student_id, login_code, students(full_name, class_id, is_active, classes(area, stage))")
      .eq("is_active", true),
    supabase.from("qr_tokens").select("student_id, token").eq("is_active", true),
    supabase
      .from("servants")
      .select("full_name, class_id")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const tokenOf = new Map((tokens ?? []).map((t) => [t.student_id, t.token]));
  const servantsOf = new Map<number, string[]>();
  for (const s of servantRows ?? []) {
    if (s.class_id == null) continue;
    servantsOf.set(s.class_id, [...(servantsOf.get(s.class_id) ?? []), s.full_name]);
  }

  const raw = (accounts ?? [])
    .map((a) => {
      const st = a.students as unknown as {
        full_name: string;
        class_id: number;
        is_active: boolean;
        classes: { area: string; stage: string } | null;
      } | null;
      if (!st || !st.is_active) return null;
      const token = tokenOf.get(a.student_id);
      if (!token) return null;
      return {
        student_id: a.student_id,
        login_code: a.login_code,
        token,
        full_name: st.full_name,
        area: st.classes?.area ?? null,
        stage: st.classes?.stage ?? null,
        servants: servantsOf.get(st.class_id) ?? [],
      };
    })
    .filter((x): x is Omit<Card, "qr"> => x !== null)
    .sort(
      (a, b) =>
        STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) ||
        AREAS.indexOf(a.area as never) - AREAS.indexOf(b.area as never) ||
        a.full_name.localeCompare(b.full_name, "ar"),
    );

  const cards: Card[] = await Promise.all(
    raw.map(async (c) => ({ ...c, qr: await qrDataUrl(c.token, 200) })),
  );

  return (
    <>
      <div className="print:hidden">
        <NavBar title="كروت الأبطال" back="/" />
      </div>

      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 print:hidden">
          <h2 className="font-bold text-slate-800">{cards.length} كارت</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            اطبع، قص، ووزّع. الولد بيدخل اللعبة <b>بالكود لوحده</b> من غير
            رقم سري، والخادم بيمسح الـQR عشان يسجّل حضوره.
          </p>
          <div className="mt-3">
            <PrintButton />
          </div>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {cards.map((c) => (
            <div
              key={c.student_id}
              className="border-2 border-dashed border-slate-300 rounded-xl p-2.5 bg-white break-inside-avoid text-center"
            >
              <p className="font-bold text-sm leading-tight" title={c.full_name}>
                {c.full_name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {[c.area, c.stage].filter(Boolean).join(" — ")}
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.qr}
                alt={`QR ${c.full_name}`}
                width={200}
                height={200}
                className="w-full max-w-[130px] mx-auto my-1.5"
              />

              <div className="bg-slate-100 rounded-lg py-1">
                <p className="text-[9px] text-slate-500 leading-none">كود الدخول</p>
                <p className="font-bold text-base tracking-[0.2em]" dir="ltr">
                  {c.login_code}
                </p>
              </div>

              {c.servants.length > 0 && (
                <p className="text-[9px] text-slate-500 mt-1.5 leading-snug">
                  خادمك: {c.servants.join(" • ")}
                </p>
              )}

              <p className="text-[8px] text-slate-400 mt-1">أبطال المهمة 🛡️</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
