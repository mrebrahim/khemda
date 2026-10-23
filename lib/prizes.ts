/** الهدايا الحقيقية — مربوطة برقم المستوى */
export const PRIZE: Record<number, { emoji: string; label: string; big?: boolean }> = {
  3: { emoji: "🃏", label: "كروت لاعبين" },
  4: { emoji: "🧦", label: "جوارب كورة" },
  5: { emoji: "🛡️", label: "واقي قصبة" },
  6: { emoji: "🥤", label: "زمزمية رياضية" },
  7: { emoji: "🎒", label: "شنطة جزمة" },
  8: { emoji: "🧤", label: "قفازات حارس مرمى" },
  9: { emoji: "⚽", label: "كورة جلد" },
  10: { emoji: "👕", label: "تيشيرت نادي", big: true },
  11: { emoji: "👟", label: "كوتشي كورة", big: true },
  12: { emoji: "🏆", label: "طقم كامل + تيشيرت باسمك ورقم ١", big: true },
};
