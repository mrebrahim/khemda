"use client";

import { useCallback, useEffect, useState } from "react";
import type { MazePuzzle } from "@/lib/games/build";

const N = 1;
const E = 2;
const S = 4;
const W = 8;

/** متاهة الأبطال: حرّك البطل لحد الكنز */
export default function Maze({
  puzzle,
  onWin,
}: {
  puzzle: MazePuzzle;
  onWin: (answers: string[]) => void;
}) {
  const [pos, setPos] = useState(puzzle.start);
  const [steps, setSteps] = useState(0);
  const [trail, setTrail] = useState<number[]>([puzzle.start]);

  const move = useCallback(
    (bit: number, dx: number, dy: number) => {
      setPos((cur) => {
        if ((puzzle.cells[cur] & bit) === 0) return cur;
        const x = (cur % puzzle.w) + dx;
        const y = Math.floor(cur / puzzle.w) + dy;
        if (x < 0 || x >= puzzle.w || y < 0 || y >= puzzle.h) return cur;
        const next = y * puzzle.w + x;
        setSteps((s) => s + 1);
        setTrail((t) => (t.includes(next) ? t : [...t, next]));
        return next;
      });
    },
    [puzzle],
  );

  useEffect(() => {
    if (pos === puzzle.goal) onWin([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, puzzle.goal]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, [number, number, number]> = {
        ArrowUp: [N, 0, -1],
        ArrowDown: [S, 0, 1],
        ArrowLeft: [W, -1, 0],
        ArrowRight: [E, 1, 0],
      };
      const m = map[e.key];
      if (!m) return;
      e.preventDefault();
      move(m[0], m[1], m[2]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <div>
      <p className="text-center text-xs text-slate-400 mb-3">
        وصّل 🏃 للكنز 🎁 — خطواتك: <span className="tabular-nums">{steps}</span>
      </p>

      {/* المتاهة بتتعرض من الشمال لليمين زي أي خريطة */}
      <div
        dir="ltr"
        className="mx-auto w-full max-w-[320px] aspect-square grid bg-white/5 border-2 border-white/25"
        style={{
          gridTemplateColumns: `repeat(${puzzle.w}, minmax(0, 1fr))`,
        }}
      >
        {puzzle.cells.map((walls, i) => {
          const isHero = i === pos;
          const isGoal = i === puzzle.goal;
          const visited = trail.includes(i);
          return (
            <div
              key={i}
              className={`grid place-content-center text-[13px] leading-none ${
                visited && !isHero ? "bg-amber-400/15" : ""
              }`}
              style={{
                borderTop: (walls & N) === 0 ? "2px solid rgba(255,255,255,.3)" : "none",
                borderRight: (walls & E) === 0 ? "2px solid rgba(255,255,255,.3)" : "none",
                borderBottom: (walls & S) === 0 ? "2px solid rgba(255,255,255,.3)" : "none",
                borderLeft: (walls & W) === 0 ? "2px solid rgba(255,255,255,.3)" : "none",
              }}
            >
              {isHero ? "🏃" : isGoal ? "🎁" : ""}
            </div>
          );
        })}
      </div>

      {/* أزرار الحركة */}
      {/* الأزرار بنفس اتجاه المتاهة: الشمال شمال واليمين يمين */}
      <div dir="ltr" className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        <span />
        <Key label="فوق" arrow="↑" onPress={() => move(N, 0, -1)} />
        <span />
        <Key label="شمال" arrow="←" onPress={() => move(W, -1, 0)} />
        <Key label="تحت" arrow="↓" onPress={() => move(S, 0, 1)} />
        <Key label="يمين" arrow="→" onPress={() => move(E, 1, 0)} />
      </div>
    </div>
  );
}

function Key({
  arrow,
  label,
  onPress,
}: {
  arrow: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className="h-14 border-2 border-white/25 bg-white/5 text-2xl text-white active:bg-amber-500/20 active:border-amber-500/60 transition"
    >
      {arrow}
    </button>
  );
}
