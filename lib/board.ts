/** أنواع وحسابات لوحة الأبطال — بتشتغل على السيرفر والكلاينت */

export type BoardRow = {
  id: number;
  display_name: string;
  area: string | null;
  stage: string | null;
  verified_xp: number;
  total_xp: number;
  rank_name: string | null;
  rank_tier: string | null;
  rank_level: number | null;
};

export type BoardRank = {
  level: number;
  name: string;
  tier: string;
  xp_required: number;
};

/** صف جاهز للعرض: فيه المركز وتقدّمه للمستوى اللي بعده */
export type Ranked = BoardRow & {
  place: number;
  isMe: boolean;
  toNext: number | null;
  percent: number;
  nextLevel: number | null;
};

export const TIER_COLOR: Record<string, string> = {
  bronze: "#d97706",
  silver: "#cbd5e1",
  gold: "#f2a900",
  platinum: "#22d3ee",
  legendary: "#a78bfa",
};

export function tierColor(tier: string | null | undefined): string {
  return TIER_COLOR[tier ?? "bronze"] ?? "#f2a900";
}

/**
 * التقدّم للمستوى اللي بعده — بنفس منطق lib/xp.ts (المستوى على إجمالي النقط).
 * مش بيحسب رتب جديدة، بيقرا سلّم الرتب زي ما هو.
 */
export function progressFor(totalXp: number, ranks: BoardRank[]) {
  const sorted = [...ranks].sort((a, b) => a.xp_required - b.xp_required);
  let current: BoardRank | null = sorted[0] ?? null;
  let next: BoardRank | null = null;

  for (const r of sorted) {
    if (totalXp >= r.xp_required) current = r;
    else {
      next = r;
      break;
    }
  }

  if (!next) return { current, next: null, toNext: null, percent: 100 };

  const floor = current?.xp_required ?? 0;
  const span = Math.max(1, next.xp_required - floor);
  const percent = Math.min(100, Math.max(0, Math.round(((totalXp - floor) / span) * 100)));
  return { current, next, toNext: next.xp_required - totalXp, percent };
}

/** رسالة حماسية حسب مركز الولد والفرق بينه وبين اللي فوقه */
export function hypeFor(place: number, gapAbove: number | null): string {
  if (place === 1) return "إنت على القمة يا أسطورة! ثبّت مكانك 👑";
  if (place <= 3) return "إنت على المنصة! خطوة كمان وتبقى الأول 🔥";
  if (place <= 10) {
    return gapAbove !== null && gapAbove > 0
      ? `يا وحش! فاضلك ${gapAbove} نقطة وتخطف المركز اللي فوقك`
      : "إنت في أول ١٠ — المنافسة ولعت! 🔥";
  }
  if (gapAbove !== null && gapAbove > 0) {
    return `فاضلك ${gapAbove} نقطة بس وتعدّي اللي قدامك — ورّينا هتوصل لفين!`;
  }
  return "كل نقطة بتفرق — ابدأ دلوقتي وهتلاقي اسمك طالع فوق 🔥";
}
