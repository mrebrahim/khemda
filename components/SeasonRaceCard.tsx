import Link from "next/link";
import { daysLabel, type SeasonRace } from "@/lib/board";

/**
 * عدّاد نهاية الموسم.
 *
 * ده المحرّك اللي بيخلّي الولد يفضل داخل كل يوم: مش «وصلت
 * ليفل ١٢ وخلاص»، لكن «فاضل ١٨ يوم وإنت التالت بفارق ٤٠
 * نقطة» — رقم بيتغيّر كل يوم ولسه فيه وقت يتعوّض.
 */
export default function SeasonRaceCard({ race }: { race: SeasonRace }) {
  const { left, place, total, gapAbove, gapBelow } = race;

  // آخر أسبوع بيبقى أحمر، وآخر ٣ أيام أكتر
  const heat = left <= 3 ? "hot" : left <= 7 ? "warm" : "calm";
  const tint =
    heat === "hot" ? "rgba(239,68,68,.6)" : heat === "warm" ? "rgba(242,169,0,.55)" : "rgba(34,211,238,.4)";

  const line =
    place === 1
      ? gapBelow !== null
        ? `إنت الأول 👑 — ورّاك ${gapBelow} نقطة. خلّي الفارق يكبر.`
        : "إنت الأول 👑"
      : gapAbove !== null && gapAbove <= 25
        ? `فارق ${gapAbove} نقطة بس عن المركز ${place - 1} — ده قداس واحد!`
        : gapAbove !== null
          ? `فاضل ${gapAbove} نقطة توصل للمركز ${place - 1}`
          : "ابدأ تجمّع نقط وتدخل السباق";

  return (
    <section className="b-frame p-4" style={{ borderColor: tint }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="sec-title font-bold text-white text-sm">⏳ سباق {race.seasonName}</h2>
          <p
            className={`text-[11px] mt-1 font-bold ${
              heat === "hot" ? "text-red-300" : heat === "warm" ? "text-amber-300" : "text-cyan-300"
            }`}
          >
            {left <= 0
              ? "النهارده آخر يوم — اللي في الأول دلوقتي هو الكسبان"
              : `فاضل ${daysLabel(left)} على آخر الموسم`}
          </p>
        </div>

        <div className="shrink-0 text-center">
          <p className="text-3xl font-bold tabular-nums text-amber-400 leading-none">
            {place}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            من <span className="tabular-nums">{total}</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-200 mt-3 leading-relaxed">{line}</p>

      <Link
        href="/board"
        className="block text-center mt-3 py-2 text-xs font-bold text-amber-300 border border-amber-500/40 hover:bg-amber-500/10 transition"
      >
        شوف اللوحة كاملة
      </Link>
    </section>
  );
}
