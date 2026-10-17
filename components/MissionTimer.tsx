"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** ١٢ س ٣٤ د — أو ٤٥ د ١٢ ث في آخر ساعة */
function format(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} س ${String(m).padStart(2, "0")} د`;
  if (m > 0) return `${m} د ${String(s).padStart(2, "0")} ث`;
  return `${s} ث`;
}

/**
 * عدّاد بيشتغل على الجهاز لكن بادئ من رقم جاي من السيرفر بتوقيت مصر،
 * عشان ساعة موبايل الولد لو مظبوطة غلط ما تأثرش.
 * لما يوصل صفر بيحدّث الصفحة عشان الحالة تتغيّر.
 */
export default function MissionTimer({
  seconds,
  label,
  tone = "amber",
}: {
  seconds: number;
  label: string;
  tone?: "amber" | "slate" | "green";
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

  const color =
    tone === "green"
      ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
      : tone === "slate"
        ? "text-slate-300 border-white/15 bg-white/5"
        : "text-amber-300 border-amber-500/40 bg-amber-500/10";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-bold border ${color}`}
    >
      <span aria-hidden="true">⏳</span>
      <span>{label}</span>
      <span className="tabular-nums">{format(Math.max(0, left))}</span>
    </span>
  );
}
