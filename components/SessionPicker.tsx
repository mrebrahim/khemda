"use client";

import { usePathname, useRouter } from "next/navigation";
import { formatArabicDate } from "@/lib/types";

/** اختيار يوم من أيام الحضور المسجّلة */
export default function SessionPicker({
  date,
  sessions,
}: {
  date: string;
  sessions: { session_date: string; is_monthly_mass: boolean }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const idx = sessions.findIndex((s) => s.session_date === date);
  const newer = idx > 0 ? sessions[idx - 1] : null;
  const older = idx >= 0 && idx < sessions.length - 1 ? sessions[idx + 1] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 print:hidden">
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="session" className="text-sm font-bold text-slate-700">
          اليوم
        </label>
        <select
          id="session"
          value={date}
          onChange={(e) => router.push(`${pathname}?date=${e.target.value}`)}
          className="rounded-xl border border-slate-300 px-3 py-2 font-bold focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        >
          {sessions.map((s) => (
            <option key={s.session_date} value={s.session_date}>
              {formatArabicDate(s.session_date)}
              {s.is_monthly_mass ? " ⭐" : ""}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5 ms-auto">
          <button
            type="button"
            disabled={!older}
            onClick={() => older && router.push(`${pathname}?date=${older.session_date}`)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40 hover:border-brand-400 transition"
          >
            الأقدم ←
          </button>
          <button
            type="button"
            disabled={!newer}
            onClick={() => newer && router.push(`${pathname}?date=${newer.session_date}`)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40 hover:border-brand-400 transition"
          >
            → الأحدث
          </button>
        </div>
      </div>
    </div>
  );
}
