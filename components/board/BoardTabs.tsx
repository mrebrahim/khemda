import Link from "next/link";

/**
 * تبويبتين: الموسم والسنة.
 *
 * لوحة الموسم بتصفّر كل موسم جديد، ولوحة السنة بتجمع كل
 * المواسم ومابتصفّرش — فمفيش نقطة بيحس الولد إنها ضاعت.
 */
export default function BoardTabs({
  isYear,
  stage,
  area,
}: {
  isYear: boolean;
  stage?: string;
  area?: string;
}) {
  const href = (year: boolean) => {
    const p = new URLSearchParams();
    if (stage) p.set("stage", stage);
    if (area) p.set("area", area);
    if (year) p.set("view", "year");
    const q = p.toString();
    return q ? `/board?${q}` : "/board";
  };

  const tab = (year: boolean, label: string, hint: string) => {
    const on = year === isYear;
    return (
      <Link
        href={href(year)}
        aria-current={on ? "page" : undefined}
        className={`px-4 py-2 text-center border-2 transition ${
          on
            ? "bg-amber-500 border-amber-400 text-slate-950"
            : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10"
        }`}
      >
        <span className="block text-sm font-bold">{label}</span>
        <span className={`block text-[10px] ${on ? "text-slate-800" : "text-slate-500"}`}>
          {hint}
        </span>
      </Link>
    );
  };

  return (
    <div className="inline-grid grid-cols-2 gap-1.5 mt-3">
      {tab(false, "الموسم", "السباق الحالي")}
      {tab(true, "السنة كلها", "مابتصفّرش")}
    </div>
  );
}
