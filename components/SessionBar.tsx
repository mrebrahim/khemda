"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { formatArabicDate } from "@/lib/types";
import { setMonthlyMass } from "@/app/attendance/actions";

export default function SessionBar({
  date,
  isMonthlyMass,
}: {
  date: string;
  isMonthlyMass: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [monthly, setMonthly] = useState(isMonthlyMass);
  const [pending, startTransition] = useTransition();

  function changeDate(next: string) {
    if (!next) return;
    router.push(`${pathname}?date=${next}`);
  }

  function toggleMonthly(next: boolean) {
    setMonthly(next);
    startTransition(async () => {
      try {
        await setMonthlyMass(date, next);
      } catch {
        setMonthly(!next);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="date" className="text-sm font-bold text-slate-700">
          التاريخ
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => changeDate(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 font-bold focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-500">{formatArabicDate(date)}</span>
      </div>

      <label
        className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 cursor-pointer transition ${
          monthly
            ? "border-amber-400 bg-amber-50"
            : "border-slate-200 bg-slate-50 hover:border-slate-300"
        }`}
      >
        <input
          type="checkbox"
          className="chk"
          checked={monthly}
          disabled={pending}
          onChange={(e) => toggleMonthly(e.target.checked)}
        />
        <span className="font-bold text-slate-800">
          ⭐ ده القداس الشهري
        </span>
      </label>
    </div>
  );
}
