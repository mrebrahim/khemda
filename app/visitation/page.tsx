import NavBar from "@/components/NavBar";
import MonthPicker from "@/components/MonthPicker";
import ServantsGate from "@/components/ServantsGate";
import NotConfigured from "@/components/NotConfigured";
import { getServantsMonth } from "@/lib/reports";
import { servantsGateState } from "@/lib/servants-gate";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function VisitationPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const gate = await servantsGateState();
  if (gate !== "open") {
    return (
      <>
        <NavBar title="الافتقاد" back="/" />
        <main className="max-w-4xl mx-auto px-3 py-4">
          {gate === "not-configured" ? <NotConfigured /> : <ServantsGate />}
        </main>
      </>
    );
  }

  const { month: raw } = await searchParams;
  const month = isValidMonth(raw) ? raw : currentMonth();
  const { sessions, servants } = await getServantsMonth(month);
  const n = sessions.length;

  const didNothing = servants.filter((s) => s.visitation === 0);

  return (
    <>
      <NavBar title="الافتقاد" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <MonthPicker
          month={month}
          note={`${n} ${n === 1 ? "أسبوع" : "أسابيع"} • ${servants.length} خادم`}
        />

        {n === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            لسه مفيش أيام مسجّلة في الشهر ده
          </p>
        ) : (
          <>
            {didNothing.length > 0 && (
              <section className="bg-red-50 border border-red-300 rounded-2xl p-4">
                <p className="font-bold text-red-900">
                  🔴 {didNothing.length} خادم ما افتقدوش خالص الشهر ده
                </p>
                <p className="text-sm text-red-800 mt-1.5">
                  {didNothing.map((s) => s.full_name).join(" • ")}
                </p>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <h2 className="font-bold text-slate-700 px-4 pt-4 pb-1">
                الافتقاد كل أسبوع
              </h2>
              <p className="text-xs text-slate-500 px-4 pb-2">
                ✅ يعني افتقد في الأسبوع ده • — يعني لأ
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-right px-3 py-2 font-bold min-w-[8rem]">
                        الخادم
                      </th>
                      {sessions.map((s) => (
                        <th
                          key={s.id}
                          className="px-2 py-2 font-bold whitespace-nowrap text-xs"
                        >
                          {s.session_date.slice(8, 10)}/{s.session_date.slice(5, 7)}
                        </th>
                      ))}
                      <th className="px-2 py-2 font-bold">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servants.map((s) => (
                      <tr
                        key={s.id}
                        className="border-t border-slate-100 even:bg-slate-50/60"
                      >
                        <td className="px-3 py-2">
                          <span className="font-bold">{s.full_name}</span>
                          <span className="block text-[11px] text-slate-400">
                            {[s.area, s.stage].filter(Boolean).join(" — ")}
                          </span>
                        </td>
                        {sessions.map((sess) => (
                          <td key={sess.id} className="px-2 py-2 text-center text-lg">
                            {s.visitationDates.has(sess.id) ? "✅" : "—"}
                          </td>
                        ))}
                        <td
                          className={`px-2 py-2 text-center tabular-nums font-bold ${
                            s.visitation === 0 ? "text-red-700" : "text-slate-800"
                          }`}
                        >
                          {s.visitation}
                          <span className="text-[11px] text-slate-400 font-normal">
                            /{n}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
