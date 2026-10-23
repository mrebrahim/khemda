/**
 * الهدايا الحقيقية — مربوطة برقم المستوى.
 *
 * مش كل مستوى بيطلّع هدية: الشارات (lib/badges.ts) هي اللي
 * بتملا الطريق بين الهدايا، فالولد بياخد حاجة كل شوية من غير
 * ما الخدمة تشتري عشر هدايا لكل ولد.
 */
export const PRIZE: Record<number, { emoji: string; label: string; big?: boolean }> = {
  6: { emoji: "⚽", label: "كورة جلد" },
  9: { emoji: "👕", label: "تيشيرت نادي", big: true },
  12: { emoji: "👟", label: "كوتشي كورة + تيشيرت باسمك ورقم ١", big: true },
};
