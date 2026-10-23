import Link from "next/link";
import { SHOP } from "@/lib/prizes";

/** الجوايز الكبيرة في المحل — وسعرها بالنقط */
export default function Prizes() {
  const big = SHOP.filter((p) => p.big);
  if (big.length === 0) return null;

  return (
    <section className="b-frame p-4" aria-label="جوايز الموسم">
      <h2 className="font-bold text-white text-sm">🎁 جوايز مستنياك!</h2>

      <ul className="mt-3 space-y-2">
        {big.map((p) => (
          <li key={p.key} className="flex items-center gap-3">
            <span className="text-3xl shrink-0 leading-none" aria-hidden="true">
              {p.emoji}
            </span>
            <span className="grow min-w-0">
              <span className="block font-bold text-white text-sm truncate">
                {p.label}
              </span>
              <span className="block text-[11px] text-amber-300 font-bold tabular-nums">
                {p.cost} نقطة
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        الهدية ليها سعر بالنقط. لما تستلمها بيتخصم سعرها من رصيدك ومستواك
        بينزل — فاختار: تجمّع للهدية الكبيرة ولا تفضل في المقدمة؟
      </p>

      <Link
        href="/hero/rewards"
        className="block text-center mt-3 py-2.5 font-bold text-sm border border-amber-500/60 text-amber-300 hover:bg-amber-500/10 transition"
      >
        افتح المحل
      </Link>
    </section>
  );
}
