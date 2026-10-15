import HeroAvatar from "@/components/board/HeroAvatar";
import { tierColor, type Ranked } from "@/lib/board";

const STYLE = {
  1: {
    medal: "🥇",
    m1: "#ffd76a",
    m2: "#c47f00",
    halo: "rgba(242,169,0,.55)",
    p1: "#f6c445",
    p2: "#a86a00",
    pb: "rgba(242,169,0,.85)",
    bar: "h-24 sm:h-28",
    label: "البطل",
    av: 92,
  },
  2: {
    medal: "🥈",
    m1: "#eef2f7",
    m2: "#8c9aae",
    halo: "rgba(125,211,252,.42)",
    p1: "#dbe4ef",
    p2: "#64748b",
    pb: "rgba(186,230,253,.7)",
    bar: "h-16 sm:h-20",
    label: "التاني",
    av: 68,
  },
  3: {
    medal: "🥉",
    m1: "#f0a35e",
    m2: "#8a4b12",
    halo: "rgba(217,119,6,.45)",
    p1: "#e49a56",
    p2: "#7c4208",
    pb: "rgba(217,119,6,.75)",
    bar: "h-12 sm:h-16",
    label: "التالت",
    av: 68,
  },
} as const;

export default function Podium({
  person,
  place,
}: {
  person?: Ranked;
  place: 1 | 2 | 3;
}) {
  if (!person) return <div aria-hidden="true" />;

  const s = STYLE[place];
  const first = place === 1;
  const color = tierColor(person.rank_tier);

  return (
    <div
      className={`relative text-center b-in ${first ? "-mt-4 sm:-mt-6" : ""}`}
      style={{ animationDelay: `${place === 1 ? 0 : place === 2 ? 0.12 : 0.24}s` }}
    >
      {/* هالة الضوء ورا الشخصية */}
      <span className="b-spot" style={{ ["--halo" as string]: s.halo }} aria-hidden="true" />

      <div className="relative">
        {first && (
          <span className="b-crown block text-2xl sm:text-3xl leading-none" aria-hidden="true">
            👑
          </span>
        )}

        <div className="relative inline-block mt-1">
          <HeroAvatar
            seed={person.id}
            size={s.av}
            color={first ? "#ffd166" : color}
            crown={false}
          />
          {/* الميدالية */}
          <span
            className={`b-medal b-shine absolute -bottom-1 ${
              first ? "-left-1 w-8 h-8 text-sm" : "-left-1 w-7 h-7 text-xs"
            }`}
            style={{ ["--m1" as string]: s.m1, ["--m2" as string]: s.m2 }}
          >
            <span className="relative z-10 tabular-nums">{place}</span>
          </span>
        </div>
      </div>

      <p
        className={`font-bold text-white leading-tight mt-2 px-0.5 ${
          first ? "text-[15px] sm:text-lg" : "text-[13px] sm:text-base"
        }`}
        title={person.display_name}
      >
        {person.display_name}
      </p>
      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate px-0.5">
        {[person.area, person.stage].filter(Boolean).join(" • ")}
      </p>

      <span
        className="inline-flex items-baseline gap-1 px-2 py-1 mt-1.5 font-bold leading-none"
        dir="ltr"
        style={{ color, border: `1px solid ${color}66`, background: `${color}1a` }}
      >
        <span className="text-[8px] tracking-[0.18em] opacity-80">LEVEL</span>
        <span className="text-xs tabular-nums">
          {String(person.rank_level ?? 1).padStart(2, "0")}
        </span>
      </span>

      {/* المنصة */}
      <div
        className={`b-pedestal ${s.bar} mt-2 grid place-content-center`}
        style={{
          ["--p1" as string]: s.p1,
          ["--p2" as string]: s.p2,
          ["--pb" as string]: s.pb,
        }}
      >
        <span
          className={`font-bold tabular-nums leading-none text-slate-950 ${
            first ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {person.verified_xp}
        </span>
        <span className="text-[10px] font-bold text-slate-900/80 mt-1">
          نقطة · {s.label}
        </span>
      </div>
    </div>
  );
}
