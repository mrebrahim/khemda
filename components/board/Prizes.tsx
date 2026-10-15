import Link from "next/link";
import { PRIZE } from "@/lib/prizes";
import type { BoardRank } from "@/lib/board";

/** جوايز الموسم الكبيرة — من نفس سلّم الرتب اللي في النظام */
export default function Prizes({ ranks }: { ranks: BoardRank[] }) {
  const big = ranks
    .filter((r) => PRIZE[r.level]?.big)
    .sort((a, b) => a.level - b.level);

  if (big.length === 0) return null;

  return (
    <section className="b-frame p-4" aria-label="جوايز الموسم">
      <h2 className="font-bold text-white text-sm">🎁 جوايز مستنياك!</h2>

      <ul className="mt-3 space-y-2">
        {big.map((r) => (
          <li key={r.level} className="flex items-center gap-3">
            <span className="text-3xl shrink-0 leading-none" aria-hidden="true">
              {PRIZE[r.level].emoji}
            </span>
            <span className="grow min-w-0">
              <span className="block font-bold text-white text-sm truncate">
                {PRIZE[r.level].label}
              </span>
              <span className="block text-[11px] text-slate-400 tabular-nums" dir="ltr">
                LEVEL {String(r.level).padStart(2, "0")} · {r.xp_required} XP
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        لما توصل للمستوى بتطلب الجايزة من صفحة الجوايز، والمشرف بيراجع الطلب
        ويسلّمهالك حسب توفّرها.
      </p>

      <Link
        href="/hero/rewards"
        className="block text-center mt-3 py-2.5 font-bold text-sm border border-amber-500/60 text-amber-300 hover:bg-amber-500/10 transition"
      >
        شوف شروط الجوايز
      </Link>
    </section>
  );
}
