/**
 * صور الـGaming المتوفرة في public/assets/gaming
 * كل اسم هنا موجود فعلاً كملف WebP بخلفية شفافة — مفيش لينك مكسور.
 */
export const GFX = {
  firstPlace: "/assets/gaming/first-place.webp",
  secondPlace: "/assets/gaming/second-place.webp",
  thirdPlace: "/assets/gaming/third-place.webp",

  crownGold: "/assets/gaming/crown-gold.webp",
  crownSilver: "/assets/gaming/crown-silver.webp",
  crownBronze: "/assets/gaming/crown-bronze.webp",
  crownGoldSm: "/assets/gaming/crown-gold-sm.webp",

  rankFirst: "/assets/gaming/rank-first.webp",
  rankSecond: "/assets/gaming/rank-second.webp",
  rankThird: "/assets/gaming/rank-third.webp",

  avatarGold: "/assets/gaming/avatar-gold.webp",
  avatarBlue: "/assets/gaming/avatar-blue.webp",
  avatarRed: "/assets/gaming/avatar-red.webp",
  avatarDefault: "/assets/gaming/avatar-default.webp",

  xpGold: "/assets/gaming/xp-gold.webp",
  xpBlue: "/assets/gaming/xp-blue.webp",
  trophyGold: "/assets/gaming/trophy-gold.webp",
  levelBadge: "/assets/gaming/level-badge.webp",

  missionBible: "/assets/gaming/mission-bible.webp",
  missionPrayer: "/assets/gaming/mission-prayer.webp",
  missionTeam: "/assets/gaming/mission-team.webp",
  missionAchievement: "/assets/gaming/mission-achievement.webp",
} as const;

/** صورة المركز للأول والتاني والتالت */
export const PLACE_CHAR: Record<number, string> = {
  1: GFX.firstPlace,
  2: GFX.secondPlace,
  3: GFX.thirdPlace,
};

export const PLACE_BADGE: Record<number, string> = {
  1: GFX.rankFirst,
  2: GFX.rankSecond,
  3: GFX.rankThird,
};

/** أفاتار ثابت لكل ولد حسب رقمه — نفس الولد بياخد نفس الشكل دايمًا */
const AVATARS = [GFX.avatarGold, GFX.avatarBlue, GFX.avatarRed];
export function avatarFor(seed: number): string {
  return AVATARS[Math.abs(seed) % AVATARS.length] ?? GFX.avatarDefault;
}
