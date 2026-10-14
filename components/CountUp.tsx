"use client";

import { useEffect, useRef, useState } from "react";

/** رقم بيعدّ لحد قيمته — بيحترم إعداد تقليل الحركة في النظام */
export default function CountUp({
  to,
  from = 0,
  duration = 900,
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
}) {
  const [value, setValue] = useState(from);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || from === to) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // تباطؤ في الآخر عشان يحس إنه وصل
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [to, from, duration]);

  return (
    <span className={className} dir="ltr">
      {value.toLocaleString("en-US")}
    </span>
  );
}
