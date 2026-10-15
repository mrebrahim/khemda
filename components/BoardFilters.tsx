"use client";

import Link from "next/link";

export default function BoardFilters({
  stage,
  area,
  stages,
  areas,
}: {
  stage?: string;
  area?: string;
  stages: string[];
  areas: string[];
}) {
  const href = (next: { stage?: string; area?: string }) => {
    const p = new URLSearchParams();
    const s = next.stage ?? stage;
    const a = next.area ?? area;
    if (s) p.set("stage", s);
    if (a) p.set("area", a);
    const q = p.toString();
    return q ? `/board?${q}` : "/board";
  };

  const Chip = ({ label, active, to }: { label: string; active: boolean; to: string }) => (
    <Link
      href={to}
      data-on={active ? "1" : "0"}
      aria-current={active ? "true" : undefined}
      className={`b-tab px-4 py-2 text-xs font-bold border ${
        active
          ? ""
          : "bg-white/5 text-slate-300 border-white/15 hover:border-amber-500/60 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-2" role="group" aria-label="فلاتر لوحة الأبطال">
      <div className="flex flex-wrap gap-1.5 justify-center">
        <Chip label="الكل" active={!stage} to={href({ stage: "" })} />
        {stages.map((s) => (
          <Chip key={s} label={s} active={stage === s} to={href({ stage: s })} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        <Chip label="كل المناطق" active={!area} to={href({ area: "" })} />
        {areas.map((a) => (
          <Chip key={a} label={a} active={area === a} to={href({ area: a })} />
        ))}
      </div>
    </div>
  );
}
