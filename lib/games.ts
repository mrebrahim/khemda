import { shiftDate, todayISO } from "@/lib/types";

/**
 * ألعاب المهمة اليومية.
 *
 * السيستم بيغيّر اللعبة لوحده: كل أسبوع الترتيب بيلف خطوة، فالسبت
 * مش هيبقى دايمًا نفس اللعبة. واللغز نفسه بيتولّد من رقم مربوط
 * بالتاريخ، يعني كل يوم لغز جديد من غير ما حد يكتب حاجة.
 */

export type GameKey =
  | "memory"
  | "scramble"
  | "maze"
  | "spot"
  | "shadow"
  | "quickfire"
  | "box";

/** المهارة اللي اللعبة بتنمّيها — دي اللي بتتعبّى في «بطاقتي كبطل» */
export type Skill =
  | "focus"
  | "thinking"
  | "knowledge"
  | "faith"
  | "decision"
  | "creativity";

export type GameDef = {
  key: GameKey;
  title: string;
  emoji: string;
  /** سطر واحد يشرح اللعبة قبل ما يبدأ */
  howTo: string;
  skill: Skill;
  /** اللعبة ليها إجابة بنتأكد منها على السيرفر؟ */
  checked: boolean;
};

export const GAMES: readonly GameDef[] = [
  {
    key: "memory",
    title: "تحدي الذاكرة",
    emoji: "🧠",
    howTo: "افتح الكروت ولاقي كل صورتين زي بعض",
    skill: "focus",
    checked: false,
  },
  {
    key: "scramble",
    title: "فك الشفرة",
    emoji: "🔤",
    howTo: "الحروف متلخبطة — رتّبها واكتشف الكلمة السرية",
    skill: "thinking",
    checked: true,
  },
  {
    key: "maze",
    title: "متاهة الأبطال",
    emoji: "🗺️",
    howTo: "حرّك البطل في المتاهة لحد ما توصل للكنز",
    skill: "thinking",
    checked: false,
  },
  {
    key: "spot",
    title: "اكتشف الاختلافات",
    emoji: "🔍",
    howTo: "الصورتين فيهم ٥ اختلافات — دوس عليهم كلهم",
    skill: "focus",
    checked: false,
  },
  {
    key: "shadow",
    title: "مين الشخصية؟",
    emoji: "👤",
    howTo: "شخصية من الكتاب المقدس في الظل — والتلميحات بتظهر واحدة واحدة",
    skill: "faith",
    checked: true,
  },
  {
    key: "quickfire",
    title: "تحدي الـ٣٠ ثانية",
    emoji: "⚡",
    howTo: "٣ أسئلة سريعة في ٣٠ ثانية",
    skill: "knowledge",
    checked: true,
  },
  {
    key: "box",
    title: "الصندوق السري",
    emoji: "🎁",
    howTo: "حل التلميحات التلاتة واطلّع رقم القفل",
    skill: "decision",
    checked: true,
  },
] as const;

export function gameByKey(key: string): GameDef | null {
  return GAMES.find((g) => g.key === key) ?? null;
}

/** بداية الموسم — الأسابيع بتتحسب منها */
export const EPOCH = "2026-09-14";

export function dowOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function daysFromEpoch(iso: string): number {
  return Math.round(
    (Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${EPOCH}T12:00:00Z`)) / 86_400_000,
  );
}

/** رقم الأسبوع من بداية الموسم (ممكن يبقى بالسالب قبلها) */
export function weekIndex(iso: string): number {
  return Math.floor(daysFromEpoch(iso) / 7);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * لعبة اليوم. الترتيب بيلف خطوة كل أسبوع، فكل لعبة بتيجي مرة في
 * الأسبوع بس في يوم مختلف — عشان الولد ما يحفظش الجدول.
 */
export function gameFor(iso: string = todayISO()): GameDef {
  return GAMES[mod(dowOf(iso) + weekIndex(iso), GAMES.length)];
}

/** لعبة بكرة — بتتعرض كتشويق من النهارده */
export function nextGame(iso: string = todayISO()): { game: GameDef; date: string } {
  const date = shiftDate(iso, 1);
  return { game: gameFor(date), date };
}

/**
 * رقم ثابت لكل (لعبة + يوم). نفس اليوم بيدّي نفس اللغز مهما اتفتح،
 * ويوم تاني بيدّي لغز تاني.
 */
export function seedFor(iso: string, key: GameKey): number {
  let h = 2166136261;
  const s = `${key}:${iso}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * رقم الدورة: كل لعبة بتيجي مرة في الأسبوع، فده بيلف على بنك
 * المحتوى بالترتيب من غير تكرار لحد ما البنك يخلص.
 */
export function cycleFor(iso: string): number {
  return mod(weekIndex(iso), 1_000_000);
}

/** مولّد أرقام عشوائية ثابت — نفس البذرة = نفس النتيجة دايمًا */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}
