/** الهدايا الحقيقية من الـPRD — مربوطة برقم المستوى */
export const PRIZE: Record<number, { emoji: string; label: string; big?: boolean }> = {
  3: { emoji: "🎟️", label: "ستيكر أو كارت مميز" },
  4: { emoji: "🏅", label: "كارت إنجاز" },
  5: { emoji: "🧢", label: "كاب أو ميدالية" },
  6: { emoji: "📚", label: "كتاب" },
  7: { emoji: "🎒", label: "إكسسوار" },
  8: { emoji: "👕", label: "تيشيرت الفريق" },
  9: { emoji: "🏐", label: "هدية رياضية" },
  10: { emoji: "⚽", label: "كرة قدم", big: true },
  11: { emoji: "🎧", label: "سماعات بلوتوث", big: true },
  12: { emoji: "⌚", label: "ساعة ذكية + كأس", big: true },
};
