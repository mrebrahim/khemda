/**
 * شريط حاضر/غايب. ألوان الحالة دايمًا معاها أيقونة ونص،
 * عشان اللي عنده عمى ألوان يفرّق من غير ما يعتمد على اللون.
 */
export default function SplitBar({
  present,
  absent,
  presentLabel = "حضروا",
  absentLabel = "ما جوش",
}: {
  present: number;
  absent: number;
  presentLabel?: string;
  absentLabel?: string;
}) {
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden bg-slate-100 gap-0.5" aria-hidden="true">
        {present > 0 && (
          <div style={{ width: `${pct}%`, background: "#0ca30c" }} className="rounded-r-lg" />
        )}
        {absent > 0 && (
          <div style={{ width: `${100 - pct}%`, background: "#d03b3b" }} className="rounded-l-lg" />
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 mt-2 text-sm">
        <span className="font-bold text-slate-700">
          ✅ {presentLabel}: <span className="tabular-nums">{present}</span>
          {total > 0 && <span className="text-slate-400 font-normal"> ({pct}%)</span>}
        </span>
        <span className="font-bold text-slate-700">
          ❌ {absentLabel}: <span className="tabular-nums">{absent}</span>
          {total > 0 && (
            <span className="text-slate-400 font-normal"> ({100 - pct}%)</span>
          )}
        </span>
      </div>
    </div>
  );
}
