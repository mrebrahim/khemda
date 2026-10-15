import Link from "next/link";
import Image from "next/image";
import HeroAvatar from "@/components/board/HeroAvatar";
import { GFX, PLACE_BADGE } from "@/lib/assets";
import { hypeFor, tierColor, type Ranked } from "@/lib/board";

/** «مستواك دلوقتي» — بتظهر للولد اللي داخل بكوده */
export default function MyCard({
  me,
  total,
  gapAbove,
}: {
  me: Ranked;
  total: number;
  gapAbove: number | null;
}) {
  const color = tierColor(me.rank_tier);

  return (
    <section className="b-frame b-me p-4" aria-label="مستواك دلوقتي">
      <div className="flex items-center gap-3">
        <HeroAvatar seed={me.id} size={56} color={color} priority />
        <div className="grow min-w-0">
          <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold">
            مستواك دلوقتي
          </p>
          <p className="font-bold text-white text-base truncate">{me.display_name}</p>
          <p className="text-[11px] text-slate-400 truncate">{me.rank_name ?? "—"}</p>
        </div>
        <span className="shrink-0 text-center">
          {PLACE_BADGE[me.place] && (
            <Image
              src={PLACE_BADGE[me.place]}
              alt=""
              width={128}
              height={128}
              aria-hidden="true"
              className="w-9 h-9 mx-auto object-contain"
            />
          )}
          <span className="block text-[10px] text-slate-400">المركز</span>
          <span className="block font-bold text-xl text-white tabular-nums leading-none">
            {me.place}
          </span>
          <span className="block text-[10px] text-slate-500 tabular-nums">من {total}</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <span
          className="inline-flex items-baseline gap-1 px-2 py-1 font-bold leading-none"
          dir="ltr"
          style={{ color, border: `1px solid ${color}66`, background: `${color}1a` }}
        >
          <span className="text-[9px] tracking-[0.18em] opacity-80">LEVEL</span>
          <span className="text-sm tabular-nums">
            {String(me.rank_level ?? 1).padStart(2, "0")}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Image src={GFX.xpGold} alt="" width={96} height={96} aria-hidden="true" className="w-6 h-6 object-contain" />
          <span className="font-bold text-amber-400 tabular-nums text-lg">
            {me.verified_xp} <span className="text-[11px] text-slate-400 font-normal">نقطة</span>
          </span>
        </span>
      </div>

      <span className="b-bar block h-2.5 bg-black/50 overflow-hidden mt-2.5">
        <span style={{ width: `${me.percent}%` }} />
      </span>

      <p className="text-[11px] text-slate-300 mt-1.5">
        {me.toNext !== null ? (
          <>
            فاضلك <b className="text-amber-400">{me.toNext}</b> نقطة على{" "}
            <span dir="ltr">LEVEL {String(me.nextLevel).padStart(2, "0")}</span>
          </>
        ) : (
          "وصلت لأعلى مستوى في الموسم 👑"
        )}
      </p>

      <p className="text-[13px] text-amber-200 font-bold mt-2.5 leading-snug">
        {hypeFor(me.place, gapAbove)}
      </p>

      <Link
        href="/hero"
        className="block text-center mt-3 py-2.5 font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
      >
        يلا نكسب نقط ←
      </Link>
    </section>
  );
}
