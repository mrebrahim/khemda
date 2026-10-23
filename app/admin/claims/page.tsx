import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { itemOf, prizeLabel } from "@/lib/prizes";
import { decide } from "./actions";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  pending: "مستنية",
  approved: "اتوافق عليها",
  delivered: "اتسلّمت",
  rejected: "مرفوضة",
};

export default async function ClaimsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reward_claims")
    .select("id, level, status, requested_at, students(full_name, classes(area, stage))")
    .order("status")
    .order("requested_at");

  const claims = (data ?? []).map((c) => {
    const st = c.students as unknown as {
      full_name: string;
      classes: { area: string; stage: string } | null;
    } | null;
    return {
      id: c.id,
      level: c.level,
      status: c.status as string,
      requested_at: c.requested_at as string,
      name: st?.full_name ?? "",
      label: [st?.classes?.area, st?.classes?.stage].filter(Boolean).join(" — "),
    };
  });

  const pending = claims.filter((c) => c.status === "pending");
  const rest = claims.filter((c) => c.status !== "pending");

  return (
    <>
      <NavBar title="طلبات الجوايز" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="font-bold text-slate-800">
            {pending.length} طلب مستني
          </p>
          <p className="text-xs text-slate-500 mt-1">
            الولد بيطلب لما يوصل للمستوى. النظام بيتأكد من نقطه قبل ما يقبل الطلب.
          </p>
        </div>

        {pending.length === 0 && (
          <p className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            مفيش طلبات مستنية
          </p>
        )}

        {pending.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-amber-300 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{itemOf(c.level)?.emoji ?? "🎁"}</span>
              <div className="grow min-w-0">
                <p className="font-bold text-brand-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {prizeLabel(c.level)} —{" "}
                  <span dir="ltr">LEVEL {String(c.level).padStart(2, "0")}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <form action={decide.bind(null, c.id, "approved")}>
                <button className="w-full rounded-xl bg-green-600 text-white py-2 font-bold text-sm hover:bg-green-700 transition">
                  وافق
                </button>
              </form>
              <form action={decide.bind(null, c.id, "delivered")}>
                <button className="w-full rounded-xl bg-brand-600 text-white py-2 font-bold text-sm hover:bg-brand-700 transition">
                  سلّمتها
                </button>
              </form>
              <form action={decide.bind(null, c.id, "rejected")}>
                <button className="w-full rounded-xl bg-slate-200 text-slate-700 py-2 font-bold text-sm hover:bg-slate-300 transition">
                  ارفض
                </button>
              </form>
            </div>
          </div>
        ))}

        {rest.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <h2 className="font-bold text-slate-700 px-4 pt-4 pb-2">اتعامل معاها</h2>
            <ul className="divide-y divide-slate-100">
              {rest.map((c) => (
                <li key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xl">{itemOf(c.level)?.emoji ?? "🎁"}</span>
                  <div className="grow min-w-0">
                    <p className="font-bold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {prizeLabel(c.level)}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${
                      c.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {LABEL[c.status] ?? c.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
