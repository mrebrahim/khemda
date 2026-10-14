import type { ActivityRule } from "@/lib/xp";

const EMOJI: Record<string, string> = {
  sunday_school: "🏫",
  mass: "⛪",
  tasbeha: "🎵",
  early: "⏰",
  communion: "🍞",
  quiz_fri_entry: "📝",
  quiz_fri_1st: "🥇",
  quiz_fri_2nd: "🥈",
  quiz_fri_3rd: "🥉",
  class_interact: "🙋",
  extra_service: "🤝",
  new_friend: "👥",
  zoom: "💻",
  quiz_thu_entry: "📝",
  quiz_thu_1st: "🥇",
  quiz_thu_2nd: "🥈",
  quiz_thu_3rd: "🥉",
  monthly_mass: "⭐",
  monthly_readings: "📜",
};

const GROUPS: { key: string; title: string; note: string; color: string }[] = [
  { key: "friday", title: "يوم الجمعة", note: "أكبر مصدر نقط في الأسبوع", color: "#f2a900" },
  { key: "thursday", title: "يوم الخميس", note: "Zoom والمسابقة", color: "#22d3ee" },
  { key: "monthly", title: "الجمعة التالتة", note: "القداس الشهري", color: "#a78bfa" },
];

export default function BonusCatalog({ rules }: { rules: ActivityRule[] }) {
  // سقف يوم الجمعة: كل حاجة ممكن أي ولد يعملها.
  // مراكز المسابقة مستثناة لأن واحد بس هو اللي بياخدها.
  const fridayMax = rules
    .filter(
      (r) =>
        r.category === "friday" &&
        r.is_active &&
        !/_(1st|2nd|3rd)$/.test(r.code),
    )
    .reduce((n, r) => n + r.xp, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-bold text-white tracking-wide">🎯 نقط تقدر تكسبها</h2>
        <span className="text-[11px] text-slate-400">
          الخادم هو اللي بيسجّلها
        </span>
      </div>

      <div className="g-card p-3 text-center">
        <p className="text-xs text-slate-400">لو حضرت كل حاجة يوم الجمعة</p>
        <p className="font-bold text-3xl text-amber-400 tabular-nums mt-0.5">
          +{fridayMax}
        </p>
        <p className="text-[11px] text-slate-500">نقطة في يوم واحد 🔥</p>
      </div>

      {GROUPS.map((g) => {
        const items = rules
          .filter((r) => r.category === g.key && r.is_active)
          .sort((a, b) => b.xp - a.xp);
        if (items.length === 0) return null;

        return (
          <div key={g.key} className="g-card g-edge p-3" style={{ ["--edge" as string]: g.color }}>
            <div className="flex items-baseline justify-between gap-2 mb-2.5">
              <p className="font-bold text-white text-sm">{g.title}</p>
              <p className="text-[11px] text-slate-500">{g.note}</p>
            </div>

            <ul className="space-y-1">
              {items.map((r) => (
                <li
                  key={r.code}
                  className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-lg shrink-0">{EMOJI[r.code] ?? "•"}</span>
                  <span className="grow min-w-0 text-sm text-slate-200 truncate">
                    {r.name_ar}
                  </span>
                  <span
                    className="shrink-0 font-bold text-sm tabular-nums"
                    style={{ color: g.color }}
                    dir="ltr"
                  >
                    +{r.xp}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
