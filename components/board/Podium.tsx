import Image from "next/image";
import { PLACE_CHAR } from "@/lib/assets";
import { tierColor, type Ranked } from "@/lib/board";

const STYLE = {
  1: {
    halo: "rgba(242,169,0,.55)",
    p1: "#f6c445", p2: "#a86a00", pb: "rgba(242,169,0,.85)",
    bar: "h-20 sm:h-24", label: "البطل", char: 148, charSm: 108,
  },
  2: {
    halo: "rgba(125,211,252,.42)",
    p1: "#dbe4ef", p2: "#64748b", pb: "rgba(186,230,253,.7)",
    bar: "h-14 sm:h-16", label: "التاني", char: 118, charSm: 88,
  },
  3: {
    halo: "rgba(217,119,6,.45)",
    p1: "#e49a56", p2: "#7c4208", pb: "rgba(217,119,6,.75)",
    bar: "h-11 sm:h-12", label: "التالت", char: 118, charSm: 88,
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
      className={`relative text-center b-in ${first ? "-mt-3 sm:-mt-5" : ""}`}
      style={{ animationDelay: `${place === 1 ? 0 : place === 2 ? 0.12 : 0.24}s` }}
    >
      {/* هالة ضوء ورا الشخصية */}
      <span className="b-spot" style={{ ["--halo" as string]: s.halo } as object} aria-hidden="true" />

      {/* شخصية المركز — الصورة فيها التاج والدرع والأجنحة */}
      <div className="relative flex justify-center">
        <Image
          src={PLACE_CHAR[place]}
          alt={`المركز ${place}`}
          width={512}
          height={512}
          priority
          sizes="(max-width: 640px) 33vw, 180px"
          className={`b-char w-auto ${first ? "h-[108px] sm:h-[148px]" : "h-[88px] sm:h-[118px]"}`}
        />
      </div>

      <p
        className={`font-bold text-white leading-tight mt-1.5 px-0.5 ${
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
        } as object}
      >
        <span
          className={`font-bold tabular-nums leading-none text-slate-950 ${
            first ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {person.total_xp}
        </span>
        <span className="text-[10px] font-bold text-slate-900/80 mt-1">
          نقطة · {s.label}
        </span>
      </div>
    </div>
  );
}
