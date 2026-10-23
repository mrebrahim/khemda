/**
 * محل الجوايز.
 *
 * النقط بقت فلوس: الهدية ليها سعر، واللي يستلمها بيتخصم منه
 * سعرها ومستواه بينزل معاها. يعني الولد بيختار بين الهدية
 * ومركزه على اللوحة — وده مقصود.
 *
 * الأرقام دي مفاتيح المحل بس (مش مستويات). بدأناها من ١٠١
 * عشان ما تتلخبطش مع طلبات الجوايز القديمة اللي كانت مربوطة
 * برقم المستوى.
 */
export type ShopItem = {
  /** مفتاح الهدية — بيتسجّل في عمود level بتاع reward_claims */
  key: number;
  emoji: string;
  label: string;
  /** سعرها بالنقط */
  cost: number;
  big?: boolean;
};

export const SHOP: readonly ShopItem[] = [
  { key: 101, emoji: "🏅", label: "كارت إنجاز", cost: 100 },
  { key: 102, emoji: "🃏", label: "كروت لاعبين", cost: 150 },
  { key: 103, emoji: "🧦", label: "جوارب كورة", cost: 200 },
  { key: 104, emoji: "🥤", label: "زمزمية رياضية", cost: 250 },
  { key: 105, emoji: "🎒", label: "شنطة جزمة", cost: 350 },
  { key: 106, emoji: "🧤", label: "قفازات حارس مرمى", cost: 400 },
  { key: 107, emoji: "⚽", label: "كورة جلد", cost: 500 },
  { key: 108, emoji: "👕", label: "تيشيرت نادي", cost: 800, big: true },
  { key: 109, emoji: "👟", label: "كوتشي كورة", cost: 1200, big: true },
  {
    key: 110,
    emoji: "🏆",
    label: "طقم كامل + تيشيرت باسمك ورقم ١",
    cost: 1800,
    big: true,
  },
] as const;

export function itemOf(key: number): ShopItem | null {
  return SHOP.find((p) => p.key === key) ?? null;
}

/** الهدايا القديمة اللي كانت مربوطة بالمستوى — للطلبات المتسجّلة قبل المحل */
export const LEGACY_PRIZE: Record<number, string> = {
  3: "ستيكر أو كارت مميز",
  4: "كارت إنجاز",
  5: "كاب أو ميدالية",
  6: "كتاب",
  7: "إكسسوار",
  8: "تيشيرت الفريق",
  9: "هدية رياضية",
  10: "كرة قدم",
  11: "سماعات بلوتوث",
  12: "ساعة ذكية + كأس",
};

/** اسم الهدية مهما كان مفتاحها — جديد أو قديم */
export function prizeLabel(key: number): string {
  return itemOf(key)?.label ?? LEGACY_PRIZE[key] ?? `هدية #${key}`;
}
