import type { ActivityRule } from "@/lib/xp";

const EMOJI: Record<string, string> = {
  sunday_school: "🏫", mass: "⛪", tasbeha: "🎵", early: "⏰", communion: "🍞",
  quiz_fri_entry: "📝", quiz_fri_1st: "🥇", quiz_fri_2nd: "🥈", quiz_fri_3rd: "🥉",
  class_interact: "🙋", extra_service: "🤝", new_friend: "👥",
  zoom: "💻", quiz_thu_entry: "📝", quiz_thu_1st: "🥇", quiz_thu_2nd: "🥈", quiz_thu_3rd: "🥉",
  monthly_mass: "⭐", monthly_readings: "📜",
};

export default function RuleList({
  rules,
  color,
  title,
  note,
}: {
  rules: ActivityRule[];
  color: string;
  title: string;
  note?: string;
}) {
  if (rules.length === 0) return null;

  return (
    <div className="g-card g-edge p-3.5" style={{ ["--edge" as string]: color }}>
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <p className="font-bold text-white text-sm">{title}</p>
        {note && <p className="text-[11px] text-slate-500">{note}</p>}
      </div>

      <ul className="space-y-1">
        {rules.map((r) => (
          <li
            key={r.code}
            className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0"
          >
            <span className="text-lg shrink-0">{EMOJI[r.code] ?? "•"}</span>
            <span className="grow min-w-0 text-sm text-slate-200">{r.name_ar}</span>
            <span
              className="shrink-0 font-bold text-sm tabular-nums"
              style={{ color }}
              dir="ltr"
            >
              +{r.xp}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
