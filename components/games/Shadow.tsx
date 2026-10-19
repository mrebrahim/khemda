"use client";

import { useState } from "react";
import type { ShadowPuzzle } from "@/lib/games/build";

/** مين الشخصية: ظل + تلميحات بتظهر واحدة واحدة */
export default function Shadow({
  puzzle,
  onWin,
  error,
}: {
  puzzle: ShadowPuzzle;
  onWin: (answers: string[]) => void;
  error: string | null;
}) {
  const [hints, setHints] = useState(1);
  const [tried, setTried] = useState<string[]>([]);

  return (
    <div>
      {/* الظل بيتكشف شوية شوية مع كل تلميح */}
      <div className="flex justify-center mb-4 h-24 items-center">
        <span
          className="text-7xl leading-none select-none transition-all duration-500"
          style={{
            filter:
              hints >= 3
                ? "blur(3px) brightness(0.85)"
                : hints === 2
                  ? "blur(9px) brightness(0.6)"
                  : "brightness(0)",
            opacity: 0.9,
          }}
          aria-hidden="true"
        >
          {puzzle.emoji}
        </span>
      </div>

      <ul className="space-y-2 mb-4">
        {puzzle.hints.slice(0, hints).map((h, i) => (
          <li
            key={i}
            className="text-sm text-slate-200 bg-white/5 border border-white/10 px-3 py-2"
          >
            <span className="text-amber-400 font-bold">تلميح {i + 1}:</span> {h}
          </li>
        ))}
      </ul>

      {hints < puzzle.hints.length && (
        <button
          type="button"
          onClick={() => setHints((h) => h + 1)}
          className="w-full border border-white/20 text-slate-300 py-2.5 font-bold text-sm mb-4"
        >
          🔎 إديني تلميح تاني
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {puzzle.choices.map((c) => {
          const wrong = tried.includes(c);
          return (
            <button
              key={c}
              type="button"
              disabled={wrong}
              onClick={() => {
                setTried((t) => [...t, c]);
                setHints((h) => Math.min(puzzle.hints.length, h + 1));
                onWin([c]);
              }}
              className={`py-3 px-2 font-bold border-2 transition ${
                wrong
                  ? "border-red-500/40 text-red-300/60 line-through"
                  : "border-white/25 bg-white/5 text-white hover:border-amber-500/60"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {error && <p className="text-center text-sm font-bold text-red-300 mt-4">{error}</p>}
    </div>
  );
}
