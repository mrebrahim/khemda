import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { settleAll } from "@/lib/referral";
import { formatArabicDate } from "@/lib/types";
import { reject } from "./actions";

export const dynamic = "force-dynamic";

const LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "مستنية أول مهمة", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { text: "اتعتمدت", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  rejected: { text: "مرفوضة", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function ReferralsPage() {
  // أي دعوة ولدها خلّص مهمته بتتعتمد هنا أوتوماتيك
  await settleAll();

  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("id, status, code_used, created_at, xp_granted, inviter_id, invitee_id")
    .order("id", { ascending: false });

  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((r) => [r.inviter_id, r.invitee_id]))];
  const { data: students } = ids.length
    ? await supabase.from("students").select("id, full_name").in("id", ids)
    : { data: [] };
  const nameOf = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  // اللي جاب دعوات كتير في يوم واحد يستاهل نظرة
  const perInviter = new Map<number, number>();
  for (const r of rows) {
    if (r.status === "rejected") continue;
    perInviter.set(r.inviter_id, (perInviter.get(r.inviter_id) ?? 0) + 1);
  }

  const approved = rows.filter((r) => r.status === "approved").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <NavBar title="دعوات الأصحاب" back="/" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">🤝 مين جاب مين</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            الولد الجديد بيكتب كود اللي علّمه اللعبة مرة واحدة. النقط
            بتنزل أوتوماتيك لما الولد الجديد يخلّص أول مهمة ليه — مش بمجرد
            كتابة الكود.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Stat n={rows.length} label="كل الدعوات" tone="slate" />
            <Stat n={approved} label="اتعتمدت" tone="green" />
            <Stat n={pending} label="مستنية" tone="amber" />
          </div>
        </section>

        {rows.length === 0 && (
          <p className="text-center text-slate-500 py-8">لسه مفيش دعوات.</p>
        )}

        {rows.map((r) => {
          const s = LABEL[r.status] ?? LABEL.pending;
          const many = (perInviter.get(r.inviter_id) ?? 0) >= 5;
          return (
            <section key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">
                    {nameOf.get(r.inviter_id) ?? "—"}
                    <span className="text-slate-400 font-normal"> علّم </span>
                    {nameOf.get(r.invitee_id) ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    بالكود <span className="font-mono" dir="ltr">{r.code_used}</span> •{" "}
                    {formatArabicDate(String(r.created_at).slice(0, 10))}
                    {r.xp_granted ? " • النقط نزلت" : ""}
                  </p>
                  {many && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      ⚠️ الولد ده جاب {perInviter.get(r.inviter_id)} دعوات — راجعها
                    </p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] font-bold border rounded-full px-2 py-1 ${s.cls}`}>
                  {s.text}
                </span>
              </div>

              {r.status !== "rejected" && (
                <form action={reject.bind(null, r.id)} className="mt-3">
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-red-200 text-red-700 text-xs font-bold py-2 hover:bg-red-50"
                  >
                    ارفض الدعوة دي ورجّع النقط
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "slate" | "green" | "amber" }) {
  const cls = {
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  }[tone];
  return (
    <div className={`rounded-xl border py-2 ${cls}`}>
      <p className="font-bold text-xl tabular-nums">{n}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
