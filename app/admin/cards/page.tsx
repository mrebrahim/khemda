import NavBar from "@/components/NavBar";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/site";
import { STAGES, AREAS } from "@/lib/types";
import { studentsWithoutCode } from "@/lib/student-code";
import MissingCodesCard from "@/components/MissingCodesCard";

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

type ClassGroup = {
  key: string;
  stage: string | null;
  area: string | null;
  saint: string | null;
  servants: string[];
  cards: Card[];
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;
  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  const [{ data: accounts }, { data: servantRows }, missing] = await Promise.all([
    supabase
      .from("student_accounts")
      .select(
        "student_id, login_code, students(full_name, class_id, is_active, classes(area, stage, saint_name))",
      )
      .eq("is_active", true),
    supabase
      .from("servants")
      .select("full_name, class_id")
      .eq("is_active", true)
      .order("full_name"),
    studentsWithoutCode(),
  ]);

  const servantsOf = new Map<number, string[]>();
  for (const s of servantRows ?? []) {
    if (s.class_id == null) continue;
    servantsOf.set(s.class_id, [...(servantsOf.get(s.class_id) ?? []), s.full_name]);
  }

  type Raw = Omit<Card, "qr"> & { class_id: number; saint: string | null };

  const raw = (accounts ?? [])
    .map((a): Raw | null => {
      const st = a.students as unknown as {
        full_name: string;
        class_id: number;
        is_active: boolean;
        classes: { area: string; stage: string; saint_name: string | null } | null;
      } | null;
      if (!st?.is_active) return null;
      return {
        student_id: a.student_id,
        login_code: a.login_code,
        full_name: st.full_name,
        area: st.classes?.area ?? null,
        stage: st.classes?.stage ?? null,
        saint: st.classes?.saint_name ?? null,
        class_id: st.class_id,
        servants: servantsOf.get(st.class_id) ?? [],
      };
    })
    .filter((x): x is Raw => x !== null)
    .filter((c) => (!stage || c.stage === stage) && (!area || c.area === area))
    .sort(
      (a, b) =>
        STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) ||
        AREAS.indexOf(a.area as never) - AREAS.indexOf(b.area as never) ||
        a.full_name.localeCompare(b.full_name, "ar"),
    );

  // الـQR هو لينك الدخول نفسه — الولد يمسحه يدخل على طول
  const qrs = await Promise.all(
    raw.map((c) => qrDataUrl(`${baseUrl}/hero/enter?c=${c.login_code}`, 260)),
  );

  // كل فصل لوحده — عشان كل فصل يطلع في ورقة A4 منفصلة
  const groups: ClassGroup[] = [];
  const byKey = new Map<string, ClassGroup>();
  raw.forEach((c, i) => {
    const key = `${c.stage ?? "?"}|${c.area ?? "?"}`;
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        stage: c.stage,
        area: c.area,
        saint: c.saint,
        servants: c.servants,
        cards: [],
      };
      byKey.set(key, g);
      groups.push(g);
    }
    g.cards.push({ ...c, qr: qrs[i] });
  });

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
        <div className="mb-4">
          <MissingCodesCard students={missing} />
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
          <h2 className="font-bold text-slate-800">
            {raw.length} كارت في {groups.length} فصل
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            الـQR على الكارت هو <b>لينك الدخول نفسه</b> — الولد يمسحه بكاميرا
            الموبايل فيدخل اللعبة على طول من غير ما يكتب حاجة. والخادم بيمسح
            نفس الكود عشان يسجّل حضوره.
          </p>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            <b>كل فصل بيطلع في ورقة A4 لوحده</b> — تطبع مرة واحدة وتدي كل خادم
            ورقة ولاده.
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

        {groups.length === 0 && (
          <p className="text-center text-slate-500 py-8 print:hidden">
            مفيش كروت للفلتر ده.
          </p>
        )}

        {groups.map((g) => (
          <section key={g.key} className="class-page mb-6">
            <header className="class-head flex items-baseline justify-between gap-2 border-b-2 border-slate-800 pb-1.5 mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {[g.stage, g.area].filter(Boolean).join(" — ")}
                  {g.saint ? (
                    <span className="font-normal text-slate-500 text-sm">
                      {" "}
                      · {g.saint}
                    </span>
                  ) : null}
                </h3>
                {g.servants.length > 0 && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    الخدام: {g.servants.join(" • ")}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500 shrink-0">{g.cards.length} كارت</p>
            </header>

            <div className="cards-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
              {g.cards.map((c) => (
                <article
                  key={c.student_id}
                  className="hero-card bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 text-center break-inside-avoid"
                >
                  <p className="text-[9px] tracking-[0.2em] text-amber-600 font-bold">
                    أبطال المهمة
                  </p>

                  <p
                    className="font-bold text-sm leading-tight mt-1 text-slate-900"
                    title={c.full_name}
                  >
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
                    <p
                      className="font-bold text-base tracking-[0.2em] text-slate-900"
                      dir="ltr"
                    >
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
          </section>
        ))}
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
