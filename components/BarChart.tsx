/**
 * أعمدة أفقية بسيطة. سلسلة واحدة = لون واحد، وكل عمود عليه رقمه،
 * فاللون مش هو اللي شايل المعنى لوحده.
 */
export default function BarChart({
  data,
  max,
  unit,
}: {
  data: { label: string; value: number; hint?: string }[];
  max?: number;
  unit?: string;
}) {
  const top = Math.max(max ?? 0, ...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.round((d.value / top) * 100);
        return (
          <li key={d.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
            <span className="text-xs text-slate-600 w-24 shrink-0 truncate" title={d.label}>
              {d.label}
            </span>
            <span className="h-5 rounded-md bg-slate-100 overflow-hidden" aria-hidden="true">
              <span
                className="block h-full rounded-md"
                style={{ width: `${pct}%`, background: "#2a78d6", minWidth: d.value > 0 ? "4px" : "0" }}
              />
            </span>
            <span className="text-sm font-bold text-slate-800 tabular-nums w-14 text-left">
              {d.value}
              {unit && <span className="text-xs text-slate-400 font-normal"> {unit}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
