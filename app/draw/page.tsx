import NavBar from "@/components/NavBar";
import { createAdminClient } from "@/lib/supabase/admin";
import { eligibleNow, listDraws, winnersOf } from "@/lib/draws";
import { createDraw, deliveredForm, runDrawForm } from "./actions";

export const dynamic = "force-dynamic";

export default async function DrawPage() {
  const supabase = await createAdminClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, ends_on")
    .eq("is_active", true)
    .maybeSingle();

  const draws = await listDraws();
  const open = draws.find((d) => d.status === "open" && d.season_id === season?.id);
  const counts = open && season ? await eligibleNow(season.id, open.min_xp, open.exclude_top) : null;

  const winnersBy = new Map(
    await Promise.all(
      draws
        .filter((d) => d.status === "drawn")
        .map(async (d) => [d.id, await winnersOf(d.id)] as const),
    ),
  );

  return (
    <>
      <NavBar title="سحب آخر الموسم" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">🎲 ليه السحب</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            الجوايز الكبيرة بتروح لأعلى ٣ بس، فباقي الولاد بيعرفوا من نص
            الموسم إنهم مش هياخدوا حاجة ويسيبوا. السحب بيخلّي الرسالة
            «كمّل وإنت داخل السحب» بدل «اتنافس على الأول» — فبتوصل لكل
            اللي بيلعبوا.
          </p>
          {season && (
            <p className="text-[11px] text-slate-500 mt-2">
              الموسم الشغّال: <span className="font-bold">{season.name}</span> — بيخلص{" "}
              {season.ends_on}
            </p>
          )}
        </section>

        {/* ── سحب مفتوح ── */}
        {open ? (
          <section className="bg-white rounded-2xl border-2 border-amber-300 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800">{open.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  الشرط: {open.min_xp} نقطة فأكتر • مستثنى أعلى {open.exclude_top}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-2.5 py-1">
                لسه ما اتسحبش
              </span>
            </div>

            {counts && (
              <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                <Box n={counts.eligible} label="داخلين السحب" tone="green" />
                <Box n={counts.playing - counts.eligible} label="لسه مش داخلين" tone="amber" />
              </div>
            )}

            <ol className="mt-3 text-sm text-slate-700 space-y-1">
              {open.prizes.map((p, i) => (
                <li key={`${p}-${i}`} className="flex gap-2">
                  <span className="text-slate-400 tabular-nums">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>

            <form action={runDrawForm.bind(null, open.id)} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-3.5 font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                🎲 اسحب دلوقتي
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-2 text-center leading-relaxed">
              السحب بيتعمل مرة واحدة بس ومش بيترجع. اعمله قدام الولاد في
              الحفلة.
            </p>
          </section>
        ) : (
          <form
            action={createDraw}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
          >
            <h3 className="font-bold text-slate-800">سحب جديد</h3>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-500">الاسم</span>
              <input
                name="title"
                defaultValue="سحب آخر الموسم"
                maxLength={80}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">
                  أقل نقط تدخّل السحب
                </span>
                <input
                  name="min_xp"
                  type="number"
                  min={0}
                  defaultValue={200}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">
                  استثني أعلى كام
                </span>
                <input
                  name="exclude_top"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={3}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-500">
                الجوايز — كل جايزة في سطر
              </span>
              <textarea
                name="prizes"
                rows={6}
                defaultValue={"كورة جلد\nسماعات\nشنطة رياضة\nكتاب مقدس باسمه\nباور بانك"}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 transition"
            >
              اعمل السحب
            </button>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              استثناء أعلى ٣ معناه إن اللي خدوا الجوايز الكبيرة مش هياخدوا
              مرتين — سيبها صفر لو عايز الكل يدخل.
            </p>
          </form>
        )}

        {/* ── سحوبات خلصت ── */}
        {draws
          .filter((d) => d.status === "drawn")
          .map((d) => {
            const winners = winnersBy.get(d.id) ?? [];
            return (
              <section
                key={d.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <header className="px-4 pt-3 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">
                    {d.title} — {d.season_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {d.eligible_count} ولد دخلوا السحب • {d.min_xp} نقطة فأكتر
                    {d.drawn_by ? ` • سحبه ${d.drawn_by}` : ""}
                  </p>
                </header>

                <ul className="px-3">
                  {winners.map((w) => (
                    <li
                      key={w.student_id}
                      className="flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold grid place-content-center tabular-nums">
                        {w.slot}
                      </span>
                      <span className="grow min-w-0">
                        <span className="block font-bold text-slate-800 truncate">
                          {w.full_name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {w.prize_label} • {w.season_xp} نقطة
                        </span>
                      </span>

                      <form
                        action={deliveredForm.bind(
                          null,
                          d.id,
                          w.student_id,
                          !w.delivered,
                        )}
                      >
                        <button
                          type="submit"
                          className={`shrink-0 rounded-lg text-xs font-bold px-3 py-2 border ${
                            w.delivered
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                              : "bg-white border-slate-300 text-slate-500"
                          }`}
                        >
                          {w.delivered ? "اتسلّمت ✓" : "سلّمتها؟"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </main>
    </>
  );
}

function Box({ n, label, tone }: { n: number; label: string; tone: "green" | "amber" }) {
  const c =
    tone === "green"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-amber-50 border-amber-200 text-amber-800";
  return (
    <div className={`rounded-xl border p-2.5 ${c}`}>
      <p className="text-2xl font-bold tabular-nums leading-none">{n}</p>
      <p className="text-[11px] mt-1">{label}</p>
    </div>
  );
}
