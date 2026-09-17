import NavBar from "@/components/NavBar";
import MonthPicker from "@/components/MonthPicker";
import BarChart from "@/components/BarChart";
import ServantsGate from "@/components/ServantsGate";
import NotConfigured from "@/components/NotConfigured";
import { getServantsMonth } from "@/lib/reports";
import { servantsGateState } from "@/lib/servants-gate";
import { currentMonth, isValidMonth } from "@/lib/month";
import { SERVANT_FIELDS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServantsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const gate = await servantsGateState();
  if (gate !== "open") {
    return (
      <>
        <NavBar title="ملخص الشهر — الخدام" back="/" />
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

  const byField = SERVANT_FIELDS.map((f) => ({
    label: f.label,
    value: servants.reduce((sum, s) => sum + s[f.key], 0),
  }));

  return (
    <>
      <NavBar title="ملخص الشهر — الخدام" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        <MonthPicker
          month={month}
          note={`${n} ${n === 1 ? "يوم" : "أيام"} • ${servants.length} خادم`}
        />

        {n === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            لسه مفيش أيام حضور مسجّلة في الشهر ده
          </p>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-bold text-slate-700">إجمالي كل خانة</h2>
              <BarChart data={byField} max={servants.length * n} unit="مرة" />
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <h2 className="font-bold text-slate-700 px-4 pt-4 pb-1">
                كل خادم على حدة
              </h2>
              <p className="text-xs text-slate-500 px-4 pb-2">
                الأرقام من {n} {n === 1 ? "يوم" : "أيام"} في الشهر.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-right px-3 py-2 font-bold min-w-[8rem]">
                        الخادم
                      </th>
                      {SERVANT_FIELDS.map((f) => (
                        <th
                          key={f.key}
                          className="px-2 py-2 font-bold whitespace-nowrap"
                        >
                          {f.label}
                        </th>
                      ))}
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
                        {SERVANT_FIELDS.map((f) => {
                          const v = s[f.key];
                          return (
                            <td
                              key={f.key}
                              className={`px-2 py-2 text-center tabular-nums font-bold ${
                                v === 0 ? "text-slate-300" : "text-slate-800"
                              }`}
                            >
                              {v}
                              <span className="text-[11px] text-slate-400 font-normal">
                                /{n}
                              </span>
                            </td>
                          );
                        })}
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
