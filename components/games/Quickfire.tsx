"use client";

import { useEffect, useState } from "react";
import type { QuickfirePuzzle } from "@/lib/games/build";

/** تحدي الـ٣٠ ثانية: ٣ أسئلة سريعة */
export default function Quickfire({
  puzzle,
  onWin,
  error,
}: {
  puzzle: QuickfirePuzzle;
  onWin: (answers: string[]) => void;
  error: string | null;
}) {
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(puzzle.seconds);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!started || left <= 0 || step >= puzzle.questions.length) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [started, left, step, puzzle.questions.length]);

  function choose(answer: string) {
    const next = [...picked, answer];
    setPicked(next);
    if (next.length === puzzle.questions.length) {
      onWin(next);
      return;
    }
    setStep((s) => s + 1);
  }

  function restart() {
    setPicked([]);
    setStep(0);
    setLeft(puzzle.seconds);
    setStarted(true);
  }

  const timeUp = started && left <= 0 && picked.length < puzzle.questions.length;

  if (!started) {
    return (
      <div className="text-center py-6">
        <p className="text-5xl mb-3">⚡</p>
        <p className="font-bold text-white">٣ أسئلة في ٣٠ ثانية</p>
        <p className="text-xs text-slate-400 mt-1">جاوب صح على التلاتة عشان تكسب</p>
        <button
          type="button"
          onClick={restart}
          className="mt-5 w-full bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-3"
        >
          يلا نبدأ
        </button>
      </div>
    );
  }

  if (timeUp) {
    return (
      <div className="text-center py-6">
        <p className="text-5xl mb-3">⏰</p>
        <p className="font-bold text-red-300">خلص الوقت!</p>
        <p className="text-xs text-slate-400 mt-1">جرّب تاني، لسه معاك فرص</p>
        <button
          type="button"
          onClick={restart}
          className="mt-5 w-full border-2 border-amber-500/60 text-amber-300 font-bold py-3"
        >
          جرّب تاني
        </button>
      </div>
    );
  }

  const q = puzzle.questions[Math.min(step, puzzle.questions.length - 1)];
  const pct = (left / puzzle.seconds) * 100;

  return (
    <div>
      <div className="h-2 bg-white/10 mb-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            left <= 10 ? "bg-red-500" : "bg-amber-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="flex justify-between text-[11px] text-slate-400 mb-4">
        <span>
          سؤال <span className="tabular-nums">{step + 1}</span> من{" "}
          <span className="tabular-nums">{puzzle.questions.length}</span>
        </span>
        <span className="tabular-nums font-bold text-white">{left} ث</span>
      </p>

      <p className="text-center font-bold text-white text-lg leading-relaxed mb-5">{q.q}</p>

      <div className="space-y-2">
        {q.choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => choose(c)}
            className="w-full py-3 px-3 font-bold border-2 border-white/25 bg-white/5 text-white hover:border-amber-500/60 transition"
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-center">
          <p className="text-sm font-bold text-red-300">{error}</p>
          <button
            type="button"
            onClick={restart}
            className="mt-3 w-full border-2 border-amber-500/60 text-amber-300 font-bold py-2.5"
          >
            جرّب تاني
          </button>
        </div>
      )}
    </div>
  );
}
