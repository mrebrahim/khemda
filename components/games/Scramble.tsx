"use client";

import { useState } from "react";
import type { ScramblePuzzle } from "@/lib/games/build";

/** فك الشفرة: رتّب الحروف واكتشف الكلمة */
export default function Scramble({
  puzzle,
  onWin,
  error,
}: {
  puzzle: ScramblePuzzle;
  onWin: (answers: string[]) => void;
  error: string | null;
}) {
  const [chosen, setChosen] = useState<number[]>([]);

  const word = chosen.map((i) => puzzle.letters[i]).join("");
  const full = chosen.length === puzzle.length;

  return (
    <div>
      <p className="text-center text-sm text-slate-300 mb-1">💡 {puzzle.hint}</p>
      <p className="text-center text-[11px] text-slate-500 mb-4">
        الكلمة من <span className="tabular-nums">{puzzle.length}</span> حروف
      </p>

      {/* الخانات */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-4">
        {Array.from({ length: puzzle.length }, (_, slot) => {
          const idx = chosen[slot];
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setChosen((c) => c.slice(0, slot))}
              disabled={idx === undefined}
              aria-label={idx === undefined ? "خانة فاضية" : `شيل ${puzzle.letters[idx]}`}
              className={`w-11 h-12 grid place-content-center text-2xl font-bold border-2 transition ${
                idx === undefined
                  ? "border-dashed border-white/20 text-slate-600"
                  : "border-amber-500/60 bg-amber-500/10 text-white"
              }`}
            >
              {idx === undefined ? "" : puzzle.letters[idx]}
            </button>
          );
        })}
      </div>

      {/* الحروف المتلخبطة */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {puzzle.letters.map((ch, i) => {
          const used = chosen.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => !used && setChosen((c) => [...c, i])}
              disabled={used}
              className={`w-11 h-12 grid place-content-center text-2xl font-bold border-2 transition ${
                used
                  ? "border-white/10 text-slate-700"
                  : "border-white/25 bg-white/5 text-white hover:border-amber-500/50"
              }`}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {error && <p className="text-center text-sm font-bold text-red-300 mt-4">{error}</p>}

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={() => setChosen([])}
          className="shrink-0 border border-white/20 text-slate-300 px-4 py-3 font-bold"
        >
          امسح
        </button>
        <button
          type="button"
          onClick={() => onWin([word])}
          disabled={!full}
          className="grow bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-3 disabled:opacity-40"
        >
          {full ? "تأكيد الكلمة" : "كمّل الحروف"}
        </button>
      </div>
    </div>
  );
}
