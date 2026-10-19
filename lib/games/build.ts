import { cycleFor, pick, rng, seedFor, shuffle, type GameKey } from "@/lib/games";
import {
  BOX_CLUES,
  MEMORY_THEMES,
  QUICKFIRE_SETS,
  SCRAMBLE_WORDS,
  SHADOW_CHARACTERS,
  SPOT_THEMES,
} from "@/lib/games/content";

/**
 * كل لغز بيتولّد من التاريخ: نفس اليوم = نفس اللغز لكل الأولاد،
 * ويوم تاني = لغز جديد من غير ما حد يكتب حاجة.
 *
 * اللي ليه إجابة بتتصحّح، الإجابة مش بتتبعت للموبايل خالص —
 * السيرفر بيعيد توليد اللغز ويقارن.
 */

export type MemoryPuzzle = {
  kind: "memory";
  theme: string;
  /** ٨ كروت = ٤ أزواج بعد الخلط */
  cards: string[];
};

export type ScramblePuzzle = {
  kind: "scramble";
  letters: string[];
  hint: string;
  length: number;
};

export type MazePuzzle = {
  kind: "maze";
  w: number;
  h: number;
  /** لكل خانة بِت لكل اتجاه مفتوح: ١ فوق • ٢ يمين • ٤ تحت • ٨ شمال */
  cells: number[];
  start: number;
  goal: number;
};

export type SpotItem = {
  id: number;
  icon: string;
  /** نسبة من عرض/ارتفاع اللوحة */
  x: number;
  y: number;
  size: number;
  rot: number;
};

export type SpotPuzzle = {
  kind: "spot";
  theme: string;
  left: SpotItem[];
  right: SpotItem[];
  /** أرقام العناصر المختلفة في اللوحة اليمين */
  diffs: number[];
};

export type ShadowPuzzle = {
  kind: "shadow";
  emoji: string;
  hints: string[];
  choices: string[];
};

export type QuickfirePuzzle = {
  kind: "quickfire";
  questions: { q: string; choices: string[] }[];
  seconds: number;
};

export type BoxPuzzle = {
  kind: "box";
  clues: string[];
};

export type Puzzle =
  | MemoryPuzzle
  | ScramblePuzzle
  | MazePuzzle
  | SpotPuzzle
  | ShadowPuzzle
  | QuickfirePuzzle
  | BoxPuzzle;

/* ── الذاكرة ── */

export function buildMemory(iso: string): MemoryPuzzle {
  const rand = rng(seedFor(iso, "memory"));
  const theme = MEMORY_THEMES[cycleFor(iso) % MEMORY_THEMES.length];
  const four = shuffle(theme.icons, rand).slice(0, 4);
  return {
    kind: "memory",
    theme: theme.name,
    cards: shuffle([...four, ...four], rand),
  };
}

/* ── فك الشفرة ── */

export function scrambleAnswer(iso: string): string {
  return SCRAMBLE_WORDS[cycleFor(iso) % SCRAMBLE_WORDS.length].word;
}

export function buildScramble(iso: string): ScramblePuzzle {
  const rand = rng(seedFor(iso, "scramble"));
  const entry = SCRAMBLE_WORDS[cycleFor(iso) % SCRAMBLE_WORDS.length];
  const letters = [...entry.word];

  // خلط لحد ما الترتيب يختلف فعلاً (الكلمة القصيرة ممكن ترجع زي ما هي)
  let mixed = shuffle(letters, rand);
  for (let i = 0; i < 12 && mixed.join("") === entry.word; i++) {
    mixed = shuffle(letters, rand);
  }

  return {
    kind: "scramble",
    letters: mixed,
    hint: entry.hint,
    length: letters.length,
  };
}

/* ── المتاهة ── */

const N = 1;
const E = 2;
const S = 4;
const W = 8;

/** متاهة كاملة الاتصال — فيه طريق واحد بين أي خانتين */
export function buildMaze(iso: string, w = 9, h = 9): MazePuzzle {
  const rand = rng(seedFor(iso, "maze"));
  const cells = new Array<number>(w * h).fill(0);
  const seen = new Array<boolean>(w * h).fill(false);
  const stack: number[] = [0];
  seen[0] = true;

  const dirs = [
    { bit: N, back: S, dx: 0, dy: -1 },
    { bit: E, back: W, dx: 1, dy: 0 },
    { bit: S, back: N, dx: 0, dy: 1 },
    { bit: W, back: E, dx: -1, dy: 0 },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const cx = cur % w;
    const cy = Math.floor(cur / w);

    const open = shuffle(dirs, rand).filter((d) => {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      return nx >= 0 && nx < w && ny >= 0 && ny < h && !seen[ny * w + nx];
    });

    if (open.length === 0) {
      stack.pop();
      continue;
    }

    const d = open[0];
    const next = (cy + d.dy) * w + (cx + d.dx);
    cells[cur] |= d.bit;
    cells[next] |= d.back;
    seen[next] = true;
    stack.push(next);
  }

  return { kind: "maze", w, h, cells, start: 0, goal: w * h - 1 };
}

/** بيتأكد إن فيه طريق من البداية للنهاية */
export function mazeSolvable(m: MazePuzzle): boolean {
  const seen = new Set<number>([m.start]);
  const queue = [m.start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === m.goal) return true;
    const x = cur % m.w;
    const y = Math.floor(cur / m.w);
    const moves: [number, number, number][] = [
      [N, x, y - 1],
      [E, x + 1, y],
      [S, x, y + 1],
      [W, x - 1, y],
    ];
    for (const [bit, nx, ny] of moves) {
      if ((m.cells[cur] & bit) === 0) continue;
      if (nx < 0 || nx >= m.w || ny < 0 || ny >= m.h) continue;
      const next = ny * m.w + nx;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/* ── اكتشف الاختلافات ── */

const SPOT_COUNT = 12;
const SPOT_DIFFS = 5;

export function buildSpot(iso: string): SpotPuzzle {
  const rand = rng(seedFor(iso, "spot"));
  const theme = SPOT_THEMES[cycleFor(iso) % SPOT_THEMES.length];

  // شبكة ٣×٤ عشان العناصر ما تركبش على بعض، مع لخبطة بسيطة في المكان
  const slots: { x: number; y: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      slots.push({ x: (col + 0.5) / 3, y: (row + 0.5) / 4 });
    }
  }

  const left: SpotItem[] = shuffle(slots, rand)
    .slice(0, SPOT_COUNT)
    .map((slot, i) => ({
      id: i,
      icon: theme.icons[Math.floor(rand() * theme.icons.length)],
      x: Math.round((slot.x + (rand() - 0.5) * 0.12) * 1000) / 10,
      y: Math.round((slot.y + (rand() - 0.5) * 0.1) * 1000) / 10,
      size: Math.round((1 + (rand() - 0.5) * 0.25) * 100) / 100,
      rot: Math.round((rand() - 0.5) * 20),
    }));

  const diffIds = shuffle(
    left.map((it) => it.id),
    rand,
  ).slice(0, SPOT_DIFFS);

  const right = left.map((it) => {
    if (!diffIds.includes(it.id)) return { ...it };

    const how = Math.floor(rand() * 3);
    if (how === 0) {
      // صورة مختلفة
      const others = theme.icons.filter((ic) => ic !== it.icon);
      return { ...it, icon: pick(others, rand) };
    }
    if (how === 1) {
      // حجم مختلف بوضوح
      return { ...it, size: Math.round(it.size * (rand() < 0.5 ? 0.6 : 1.5) * 100) / 100 };
    }
    // ميلان واضح
    return { ...it, rot: it.rot + (rand() < 0.5 ? -55 : 55) };
  });

  return { kind: "spot", theme: theme.name, left, right, diffs: diffIds.sort((a, b) => a - b) };
}

/* ── مين الشخصية ── */

export function shadowAnswer(iso: string): string {
  return SHADOW_CHARACTERS[cycleFor(iso) % SHADOW_CHARACTERS.length].answer;
}

export function buildShadow(iso: string): ShadowPuzzle {
  const rand = rng(seedFor(iso, "shadow"));
  const entry = SHADOW_CHARACTERS[cycleFor(iso) % SHADOW_CHARACTERS.length];
  return {
    kind: "shadow",
    emoji: entry.emoji,
    hints: [...entry.hints],
    choices: shuffle([entry.answer, ...entry.wrong], rand),
  };
}

/* ── تحدي الـ٣٠ ثانية ── */

export function quickfireAnswers(iso: string): string[] {
  return QUICKFIRE_SETS[cycleFor(iso) % QUICKFIRE_SETS.length].map((q) => q.answer);
}

export function buildQuickfire(iso: string): QuickfirePuzzle {
  const rand = rng(seedFor(iso, "quickfire"));
  const set = QUICKFIRE_SETS[cycleFor(iso) % QUICKFIRE_SETS.length];
  return {
    kind: "quickfire",
    seconds: 30,
    questions: set.map((q) => ({ q: q.q, choices: shuffle(q.choices, rand) })),
  };
}

/* ── الصندوق السري ── */

export function boxAnswer(iso: string): string {
  return BOX_CLUES[cycleFor(iso) % BOX_CLUES.length].map((c) => c.digit).join("");
}

export function buildBox(iso: string): BoxPuzzle {
  const set = BOX_CLUES[cycleFor(iso) % BOX_CLUES.length];
  return { kind: "box", clues: set.map((c) => c.q) };
}

/* ── الواجهة الموحّدة ── */

export function buildPuzzle(key: GameKey, iso: string): Puzzle {
  switch (key) {
    case "memory":
      return buildMemory(iso);
    case "scramble":
      return buildScramble(iso);
    case "maze":
      return buildMaze(iso);
    case "spot":
      return buildSpot(iso);
    case "shadow":
      return buildShadow(iso);
    case "quickfire":
      return buildQuickfire(iso);
    case "box":
      return buildBox(iso);
  }
}

/**
 * الإجابة الصح للألعاب اللي بتتصحّح. بترجع null للألعاب اللي
 * بتتأكد من نفسها على الموبايل (ذاكرة، متاهة، اختلافات).
 */
export function solutionFor(key: GameKey, iso: string): string[] | null {
  switch (key) {
    case "scramble":
      return [scrambleAnswer(iso)];
    case "shadow":
      return [shadowAnswer(iso)];
    case "quickfire":
      return quickfireAnswers(iso);
    case "box":
      return [boxAnswer(iso)];
    default:
      return null;
  }
}

/** مقارنة إجابة الولد بالحل — بتتجاهل المسافات الزيادة */
export function checkAnswer(key: GameKey, iso: string, given: string[]): boolean {
  const want = solutionFor(key, iso);
  if (!want) return true;
  if (given.length !== want.length) return false;
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return want.every((w, i) => clean(w) === clean(given[i] ?? ""));
}
