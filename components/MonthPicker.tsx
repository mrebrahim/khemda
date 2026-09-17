"use client";

import { useRouter, usePathname } from "next/navigation";
import { formatMonth, shiftMonth } from "@/lib/month";

export default function MonthPicker({
  month,
  note,
}: {
  month: string;
  note?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (ym: string) => router.push(`${pathname}?month=${ym}`);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        {/* السهم لليمين = الشهر اللي فات، عشان الاتجاه عربي */}
        <button
          type="button"
          onClick={() => go(shiftMonth(month, -1))}
          aria-label="الشهر اللي فات"
          className="rounded-xl border border-slate-300 px-3 py-2 font-bold hover:bg-slate-50 transition"
        >
          ›
        </button>

        <div className="grow text-center">
          <p className="font-bold text-brand-900">{formatMonth(month)}</p>
          {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
        </div>

        <button
          type="button"
          onClick={() => go(shiftMonth(month, 1))}
          aria-label="الشهر الجاي"
          className="rounded-xl border border-slate-300 px-3 py-2 font-bold hover:bg-slate-50 transition"
        >
          ‹
        </button>
      </div>

      <input
        type="month"
        value={month}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-center focus:outline-hidden focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
