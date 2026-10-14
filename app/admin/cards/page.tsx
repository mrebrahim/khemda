import NavBar from "@/components/NavBar";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/site";
import { STAGES, AREAS } from "@/lib/types";

export const dynamic = "force-dynamic";

type Card = {
  student_id: number;
  login_code: string;
  qr: string;
  full_name: string;
  area: string | null;
  stage: string | null;
  servants: string[];
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;
  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  const [{ data: accounts }, { data: servantRows }] = await Promise.all([
    supabase
      .from("student_accounts")
      .select("student_id, login_code, students(full_name, class_id, is_active, classes(area, stage))")
      .eq("is_active", true),
    supabase
      .from("servants")
      .select("full_name, class_id")
      .eq("is_active", true)
      .order("full_name"),
  ]);

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
      if (!st?.is_active) return null;
      return {
        student_id: a.student_id,
        login_code: a.login_code,
        full_name: st.full_name,
        area: st.classes?.area ?? null,
        stage: st.classes?.stage ?? null,
        servants: servantsOf.get(st.class_id) ?? [],
      };
    })
    .filter((x): x is Omit<Card, "qr"> => x !== null)
    .filter((c) => (!stage || c.stage === stage) && (!area || c.area === area))
    .sort(
      (a, b) =>
        STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) ||
        AREAS.indexOf(a.area as never) - AREAS.indexOf(b.area as never) ||
        a.full_name.localeCompare(b.full_name, "ar"),
    );

  // الـQR هو لينك الدخول نفسه — الولد يمسحه يدخل على طول
  const cards: Card[] = await Promise.all(
    raw.map(async (c) => ({
      ...c,
      qr: await qrDataUrl(`${baseUrl}/hero/enter?c=${c.login_code}`, 260),
    })),
  );

  const filterHref = (next: { stage?: string; area?: string }) => {
    const p = new URLSearchParams();
    const s = next.stage ?? stage;
    const a = next.area ?? area;
    if (s) p.set("stage", s);
    if (a) p.set("area", a);
    const q = p.toString();
    return q ? `/admin/cards?${q}` : "/admin/cards";
  };

  return (
    <>
      <div className="print:hidden">
        <NavBar title="كروت الأبطال" back="/" />
      </div>

      <main className="max-w-5xl mx-auto px-3 py-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
          <h2 className="font-bold text-slate-800">{cards.length} كارت</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            الـQR على الكارت هو <b>لينك الدخول نفسه</b> — الولد يمسحه بكاميرا
            الموبايل فيدخل اللعبة على طول من غير ما يكتب حاجة. والخادم بيمسح
            نفس الكود عشان يسجّل حضوره.
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Chip href={filterHref({ stage: "" })} active={!stage} label="كل المراحل" />
            {STAGES.map((s) => (
              <Chip key={s} href={filterHref({ stage: s })} active={stage === s} label={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip href={filterHref({ area: "" })} active={!area} label="كل المناطق" />
            {AREAS.map((a) => (
              <Chip key={a} href={filterHref({ area: a })} active={area === a} label={a} />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <PrintButton />
            <p className="text-xs text-slate-500">
              للحفظ كـPDF: اطبع واختار &quot;Save as PDF&quot;
            </p>
          </div>
        </section>

        <div className="cards-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map((c) => (
            <article
              key={c.student_id}
              className="hero-card bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 text-center break-inside-avoid"
            >
              <p className="text-[9px] tracking-[0.2em] text-amber-600 font-bold">
                أبطال المهمة
              </p>

              <p className="font-bold text-sm leading-tight mt-1 text-slate-900" title={c.full_name}>
                {c.full_name}
              </p>
              <p className="text-[10px] text-slate-500">
                {[c.area, c.stage].filter(Boolean).join(" — ")}
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.qr}
                alt={`كود ${c.full_name}`}
                width={260}
                height={260}
                className="w-full max-w-[128px] mx-auto my-2"
              />

              <p className="text-[9px] text-slate-500 leading-none">امسح الكود تدخل</p>

              <div className="bg-amber-50 border border-amber-300 rounded-lg py-1 mt-1.5">
                <p className="text-[8px] text-amber-700 leading-none">كودك</p>
                <p className="font-bold text-base tracking-[0.2em] text-slate-900" dir="ltr">
                  {c.login_code}
                </p>
              </div>

              {c.servants.length > 0 && (
                <p className="text-[9px] text-slate-600 mt-1.5 leading-snug">
                  خادمك: {c.servants.join(" • ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
      }`}
    >
      {label}
    </a>
  );
}
