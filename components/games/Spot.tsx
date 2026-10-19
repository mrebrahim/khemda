"use client";

import { useEffect, useState } from "react";
import type { SpotItem, SpotPuzzle } from "@/lib/games/build";

/** اكتشف الاختلافات: ٥ فروق بين اللوحتين */
export default function Spot({
  puzzle,
  onWin,
}: {
  puzzle: SpotPuzzle;
  onWin: (answers: string[]) => void;
}) {
  const [found, setFound] = useState<number[]>([]);
  const [miss, setMiss] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (found.length === puzzle.diffs.length) onWin([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.length, puzzle.diffs.length]);

  function tap(id: number) {
    if (found.includes(id)) return;
    if (puzzle.diffs.includes(id)) {
      setFound((f) => [...f, id]);
      return;
    }
    setMiss((m) => m + 1);
    setShake(true);
    setTimeout(() => setShake(false), 350);
  }

  return (
    <div>
      <p className="text-center text-xs text-slate-400 mb-3">
        مشهد <span className="text-amber-400 font-bold">{puzzle.theme}</span> — لقيت{" "}
        <span className="tabular-nums">{found.length}</span> من{" "}
        <span className="tabular-nums">{puzzle.diffs.length}</span>
        {miss > 0 && <span className="text-slate-500"> • غلط {miss}</span>}
      </p>

      <div className="space-y-2">
        <Board items={puzzle.left} label="اللوحة الأصلية" />
        <p className="text-center text-[11px] text-slate-500">
          👇 دوس على الاختلافات في اللوحة دي
        </p>
        <Board
          items={puzzle.right}
          label="دوّر على الاختلافات"
          onTap={tap}
          found={found}
          shake={shake}
        />
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {puzzle.diffs.map((id, i) => (
          <span
            key={id}
            className={`w-7 h-7 grid place-content-center text-sm border ${
              found.includes(id)
                ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                : "border-white/15 text-slate-600"
            }`}
          >
            {found.includes(id) ? "✓" : i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function Board({
  items,
  label,
  onTap,
  found = [],
  shake = false,
}: {
  items: SpotItem[];
  label: string;
  onTap?: (id: number) => void;
  found?: number[];
  shake?: boolean;
}) {
  return (
    <div
      aria-label={label}
      className={`relative w-full aspect-4/3 border-2 border-white/20 bg-linear-to-b from-slate-800 to-slate-900 overflow-hidden ${
        shake ? "motion-safe:animate-pulse" : ""
      }`}
    >
      {items.map((it) => {
        const isFound = found.includes(it.id);
        const style = {
          left: `${it.x}%`,
          top: `${it.y}%`,
          transform: `translate(-50%, -50%) rotate(${it.rot}deg) scale(${it.size})`,
        } as const;

        if (!onTap) {
          return (
            <span
              key={it.id}
              aria-hidden="true"
              className="absolute text-3xl leading-none select-none"
              style={style}
            >
              {it.icon}
            </span>
          );
        }

        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onTap(it.id)}
            aria-label={isFound ? "اختلاف لقيته" : "عنصر"}
            className={`absolute text-3xl leading-none ${
              isFound ? "ring-2 ring-emerald-400 rounded-full bg-emerald-400/20" : ""
            }`}
            style={style}
          >
            {it.icon}
          </button>
        );
      })}
    </div>
  );
}
