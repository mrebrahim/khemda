"use client";

import { useCallback, useEffect, useState } from "react";
import { answerQuestion, nextQuestion } from "@/app/hero/drop/actions";
import type { PublicQuestion } from "@/lib/lucky-missions";
import { playPoint } from "@/lib/sound";

/**
 * التحدي اللي قبل الصندوق: سؤال إيمان أو لغز.
 *
 * الإجابة الصح مابتوصلش للمتصفح — بنبعت الاختيارات بس،
 * والتصحيح بيحصل على السيرفر وبيرجّع تصريح موقّع.
 */
export default function DropChallenge({
  first,
  onPass,
}: {
  /** أول سؤال جاي جاهز من السيرفر، فمفيش انتظار */
  first: PublicQuestion | null;
  onPass: (solved: string) => void;
}) {
  const [q, setQ] = useState<PublicQuestion | null>(first);
  const [seen, setSeen] = useState<string[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (exclude: string[]) => {
    setPicked(null);
    setWrong(false);
    setNote(null);
    const next = await nextQuestion(exclude);
    setQ(next);
  }, []);

  useEffect(() => {
    if (!first) void load([]);
  }, [first, load]);

  async function choose(i: number) {
    if (!q || busy) return;
    setBusy(true);
    setPicked(i);

    const res = await answerQuestion(q.key, i);
    if (res.ok) {
      setNote(res.note ?? null);
      playPoint();
      setTimeout(() => onPass(res.pass), res.note ? 1600 : 700);
      return;
    }

    setWrong(true);
    setBusy(false);
    const next = [...seen, q.key];
    setSeen(next);
    setTimeout(() => void load(next), 1400);
  }

  if (!q) {
    return (
      <div className="b-frame p-6 text-center">
        <p className="text-slate-400">بنجهّز التحدي…</p>
      </div>
    );
  }

  return (
    <div className="b-frame p-6" style={{ borderColor: "rgba(242,169,0,.5)" }}>
      <p className="text-center text-xs text-slate-400">
        {q.kind === "faith" ? "سؤال إيمان 📖" : "لغز 🧩"}
      </p>
      <p className="text-center font-bold text-white text-lg mt-1">
        جاوب صح والصندوق يفتح
      </p>

      <p className="text-center text-xl text-amber-200 font-bold mt-6 leading-relaxed">
        {q.q}
      </p>

      <div className="mt-6 space-y-2">
        {q.choices.map((c, i) => {
          const isPicked = picked === i;
          const tone = isPicked
            ? wrong
              ? "bg-red-500/20 border-red-400 text-red-200"
              : "bg-emerald-500/20 border-emerald-400 text-emerald-200"
            : "bg-white/5 border-white/15 text-white hover:bg-white/10";
          return (
            <button
              key={c}
              type="button"
              onClick={() => void choose(i)}
              disabled={busy}
              className={`w-full border-2 font-bold py-3.5 px-4 text-start transition disabled:opacity-60 ${tone}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {wrong && (
        <p className="text-center text-sm font-bold text-amber-300 mt-4">
          مش دي 🙂 جايبلك سؤال تاني…
        </p>
      )}
      {note && (
        <p className="text-center text-sm text-emerald-300 mt-4 leading-relaxed">{note}</p>
      )}
    </div>
  );
}
