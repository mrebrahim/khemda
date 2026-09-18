"use client";

import { useRouter, usePathname } from "next/navigation";
import { formatArabicDate } from "@/lib/types";

export default function AbsentDateBar({
  date,
  by,
  criteria,
}: {
  date: string;
  by: string;
  criteria: readonly { key: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (nextDate: string, nextBy: string) =>
    router.push(`${pathname}?date=${nextDate}&by=${nextBy}`);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="date" className="text-sm font-bold text-slate-700">
          اليوم
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && go(e.target.value, by)}
          className="rounded-xl border border-slate-300 px-3 py-2 font-bold focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-500">{formatArabicDate(date)}</span>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-1.5">
          يعتبر حاضر لو حضر:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {criteria.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => go(date, c.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                by === c.key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
