"use client";

import { useState } from "react";
import type { BoxPuzzle } from "@/lib/games/build";

/** الصندوق السري: كل تلميح بيدّي رقم، والتلاتة بيفتحوا القفل */
export default function SecretBox({
  puzzle,
  onWin,
  error,
}: {
  puzzle: BoxPuzzle;
  onWin: (answers: string[]) => void;
  error: string | null;
}) {
  const [digits, setDigits] = useState<string[]>(() => puzzle.clues.map(() => ""));

  const full = digits.every((d) => /^[0-9]$/.test(d));

  function set(i: number, value: string) {
    const d = value.replace(/[^0-9]/g, "").slice(-1);
    setDigits((cur) => cur.map((x, k) => (k === i ? d : x)));
  }

  return (
    <div>
      <div className="text-center mb-5">
        <span className="text-6xl leading-none">{full ? "🔓" : "🔒"}</span>
      </div>

      <ul className="space-y-3">
        {puzzle.clues.map((clue, i) => (
          <li key={i} className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i]}
              onChange={(e) => set(i, e.target.value)}
              aria-label={`رقم التلميح ${i + 1}`}
              className="shrink-0 w-14 h-14 text-center text-2xl font-bold bg-white/5 border-2 border-white/25 text-white focus:border-amber-500 focus:outline-none"
            />
            <p className="grow text-sm text-slate-200 leading-relaxed">
              <span className="text-amber-400 font-bold">{i + 1}.</span> {clue}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 text-center">
        <p className="text-[11px] text-slate-500 mb-2">رقم القفل</p>
        <p className="text-3xl font-bold tracking-[0.5em] text-white tabular-nums" dir="ltr">
          {digits.map((d) => d || "•").join("")}
        </p>
      </div>

      {error && <p className="text-center text-sm font-bold text-red-300 mt-4">{error}</p>}

      <button
        type="button"
        onClick={() => onWin([digits.join("")])}
        disabled={!full}
        className="mt-5 w-full bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-3 disabled:opacity-40"
      >
        {full ? "افتح الصندوق" : "كمّل الأرقام التلاتة"}
      </button>
    </div>
  );
}
