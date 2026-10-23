/**
 * شارات الأبطال.
 *
 * الشارة مش هدية — دي علامة على حاجة الولد عملها فعلاً.
 * وكلها **محسوبة** من سجل النقط اللي موجود أصلاً، مش متسجّلة
 * في جدول لوحدها: يعني مفيش خادم بيديها بإيده، ومفيش حاجة
 * ممكن تتنسى أو تتكرر.
 */

export type BadgeTier = "bronze" | "silver" | "gold" | "legendary";

export type Badge = {
  code: string;
  emoji: string;
  label: string;
  /** شرح قصير للولد */
  detail: string;
  tier: BadgeTier;
  /**
   * الشارة بتتفتح لما العداد يوصل `need`.
   * `rule` هو كود النشاط في سجل النقط، أو "streak" لأطول سلسلة.
   * ولو `rules` اتبعتت بنجمع عدّاداتها كلها.
   */
  rule?: string;
  rules?: readonly string[];
  need: number;
};

export const BADGES: readonly Badge[] = [
  /* ── الاستمرار ── */
  {
    code: "fire_3",
    emoji: "🔥",
    label: "نار ٣ أيام",
    detail: "٣ أيام ورا بعض من غير ما تقطع",
    tier: "bronze",
    rule: "streak",
    need: 3,
  },
  {
    code: "fire_7",
    emoji: "🔥",
    label: "أسبوع كامل",
    detail: "٧ أيام ورا بعض",
    tier: "silver",
    rule: "streak",
    need: 7,
  },
  {
    code: "fire_14",
    emoji: "🔥",
    label: "أسبوعين",
    detail: "١٤ يوم ورا بعض",
    tier: "gold",
    rule: "streak",
    need: 14,
  },
  {
    code: "fire_30",
    emoji: "👑",
    label: "شهر من غير ما تقطع",
    detail: "٣٠ يوم ورا بعض — دي مش سهلة",
    tier: "legendary",
    rule: "streak",
    need: 30,
  },

  /* ── الكنيسة ── */
  {
    code: "mass_4",
    emoji: "⛪",
    label: "٤ قداسات",
    detail: "حضرت القداس ٤ مرات",
    tier: "bronze",
    rule: "mass",
    need: 4,
  },
  {
    code: "mass_12",
    emoji: "⛪",
    label: "١٢ قداس",
    detail: "حضرت القداس ١٢ مرة",
    tier: "gold",
    rule: "mass",
    need: 12,
  },
  {
    code: "tasbeha_4",
    emoji: "🎶",
    label: "صوت التسبحة",
    detail: "حضرت التسبحة ٤ مرات",
    tier: "silver",
    rules: ["tasbeha", "tasbeha_bonus"],
    need: 4,
  },
  {
    code: "reader",
    emoji: "🎙️",
    label: "قارئ القداس",
    detail: "قريت القراءات في القداس",
    tier: "gold",
    rule: "readings",
    need: 1,
  },
  {
    code: "prep_3",
    emoji: "📖",
    label: "مستعد دايمًا",
    detail: "حضرت تحضير القرايات ٣ مرات",
    tier: "silver",
    rule: "readings_prep",
    need: 3,
  },
  {
    code: "school_8",
    emoji: "🧒",
    label: "ابن الفصل",
    detail: "حضرت مدارس الأحد ٨ مرات",
    tier: "silver",
    rule: "sunday_school",
    need: 8,
  },

  /* ── البيت ── */
  {
    code: "home_3",
    emoji: "🏠",
    label: "قلب من ذهب",
    detail: "عملت ٣ مهمات في بيتك",
    tier: "bronze",
    rule: "home_mission",
    need: 3,
  },
  {
    code: "home_7",
    emoji: "💛",
    label: "سند البيت",
    detail: "عملت ٧ مهمات في بيتك",
    tier: "gold",
    rule: "home_mission",
    need: 7,
  },

  /* ── المسابقات والأصحاب ── */
  {
    code: "quiz_win",
    emoji: "🧠",
    label: "كسبت مسابقة",
    detail: "جبت المركز الأول في مسابقة",
    tier: "gold",
    rules: ["quiz_thu_1st", "quiz_fri_1st"],
    need: 1,
  },
  {
    code: "quiz_full",
    emoji: "💯",
    label: "الدرجة كاملة",
    detail: "جبت الدرجة النهائية في مسابقة",
    tier: "silver",
    rule: "quiz_full",
    need: 1,
  },
  {
    code: "friend_3",
    emoji: "🤝",
    label: "جامع الأصحاب",
    detail: "علّمت ٣ أصحاب اللعبة",
    tier: "gold",
    rule: "referral",
    need: 3,
  },
  {
    code: "lucky",
    emoji: "🎁",
    label: "فتحت الصندوق",
    detail: "فتحت صندوق الحظ الأسطوري",
    tier: "bronze",
    rule: "lucky_drop",
    need: 1,
  },
] as const;

export const TIER_STYLE: Record<BadgeTier, { ring: string; text: string }> = {
  bronze: { ring: "rgba(217,119,6,.55)", text: "#fbbf24" },
  silver: { ring: "rgba(203,213,225,.5)", text: "#e2e8f0" },
  gold: { ring: "rgba(242,169,0,.65)", text: "#fbbf24" },
  legendary: { ring: "rgba(167,139,250,.7)", text: "#c4b5fd" },
};

export type EarnedBadge = Badge & { have: number; done: boolean };

/** بيحسب كل شارة من عدّادات الولد */
export function badgesFor(
  counts: Record<string, number>,
  longestStreak: number,
): EarnedBadge[] {
  return BADGES.map((b) => {
    const have =
      b.rule === "streak"
        ? longestStreak
        : (b.rules ?? [b.rule ?? ""]).reduce((n, r) => n + (counts[r] ?? 0), 0);
    return { ...b, have, done: have >= b.need };
  });
}

const TIER_RANK: Record<BadgeTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  legendary: 3,
};

/**
 * الشارة اللي بعدها على طول — أقرب واحدة لسه ناقصة.
 *
 * لو أكتر من واحدة على نفس البُعد بناخد الأسهل، عشان الولد
 * الجديد ما يتحطّش قدامه «قرا في القداس» كأول هدف.
 */
export function nextBadge(list: EarnedBadge[]): EarnedBadge | null {
  const open = list.filter((b) => !b.done);
  if (open.length === 0) return null;
  return open.reduce((best, b) => {
    const gap = b.need - b.have;
    const bestGap = best.need - best.have;
    if (gap !== bestGap) return gap < bestGap ? b : best;
    return TIER_RANK[b.tier] < TIER_RANK[best.tier] ? b : best;
  });
}
