"use client";

import { useEffect, useState } from "react";
import type { MemoryPuzzle } from "@/lib/games/build";

/** تحدي الذاكرة: افتح كل اتنين زي بعض */
export default function Memory({
  puzzle,
  onWin,
}: {
  puzzle: MemoryPuzzle;
  onWin: (answers: string[]) => void;
}) {
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open.length !== 2) return;
    setBusy(true);
    const [a, b] = open;
    const same = puzzle.cards[a] === puzzle.cards[b];
    const t = setTimeout(
      () => {
        if (same) setFound((f) => [...f, a, b]);
        setOpen([]);
        setBusy(false);
      },
      same ? 350 : 750,
    );
    return () => clearTimeout(t);
  }, [open, puzzle.cards]);

  useEffect(() => {
    if (found.length === puzzle.cards.length) onWin([]);
    // onWin بتتغيّر مع كل رسم، فبنعتمد على عدد المكشوف بس
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.length, puzzle.cards.length]);

  function flip(i: number) {
    if (busy || open.includes(i) || found.includes(i)) return;
    setOpen((o) => [...o, i]);
    if (open.length === 1) setMoves((m) => m + 1);
  }

  return (
    <div>
      <p className="text-center text-xs text-slate-400 mb-3">
        مجموعة النهارده: <span className="text-amber-400 font-bold">{puzzle.theme}</span> •
        لقيت <span className="tabular-nums">{found.length / 2}</span> من ٤
      </p>

      <div className="grid grid-cols-4 gap-2">
        {puzzle.cards.map((icon, i) => {
          const shown = open.includes(i) || found.includes(i);
          const matched = found.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(i)}
              aria-label={shown ? icon : "كارت مقلوب"}
              className={`aspect-square grid place-content-center text-3xl border-2 transition ${
                matched
                  ? "border-emerald-500/70 bg-emerald-500/15"
                  : shown
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-white/15 bg-white/5 hover:border-amber-500/40"
              }`}
            >
              {shown ? <span>{icon}</span> : <span className="text-xl text-slate-600">؟</span>}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-3 tabular-nums">
        محاولات: {moves}
      </p>
    </div>
  );
}
