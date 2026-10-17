"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatLeft } from "@/lib/events";

/**
 * عدّاد المعاد الجاي. الثواني بتيجي محسوبة من السيرفر بتوقيت مصر،
 * فساعة الجهاز لو مظبوطة غلط مش هتغلّط العدّاد.
 */
export default function EventCountdown({
  seconds,
  live,
  prefix,
}: {
  seconds: number;
  live: boolean;
  prefix?: string;
}) {
  const [left, setLeft] = useState(seconds);
  const router = useRouter();

  useEffect(() => setLeft(seconds), [seconds]);

  useEffect(() => {
    if (left <= 0) {
      router.refresh();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, router]);

  if (live) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[12px] font-bold text-red-700">
        <span className="w-2 h-2 rounded-full bg-red-600 motion-safe:animate-pulse" />
        شغّال دلوقتي — باقي {formatLeft(left)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[12px] font-bold text-slate-700">
      <span aria-hidden="true">⏳</span>
      {prefix ?? "فاضل"} <span className="tabular-nums">{formatLeft(left)}</span>
    </span>
  );
}
