"use client";

import { useState, useTransition } from "react";
import { submitInvite } from "@/app/hero/actions";
import { playPoint } from "@/lib/sound";

/**
 * كارت «مين علّمك اللعبة؟» — بيظهر للحسابات الجديدة بس،
 * ومرة واحدة: أول ما يكتب الكود الكارت بيتقفل.
 */
export default function InviteCard({
  myCode,
  state,
  inviterName,
  xp,
}: {
  myCode: string | null;
  state: "can-invite" | "done" | "not-new";
  inviterName: string | null;
  xp: number;
}) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(state === "done");
  const [pending, startTransition] = useTransition();

  const share = myCode
    ? `https://wa.me/?text=${encodeURIComponent(
        `أنا بلعب «أبطال المهمة» 🔥\nادخل من هنا: https://khemda.vercel.app/hero\nولما يسألك مين علّمك اللعبة اكتب كودي: ${myCode}`,
      )}`
    : null;

  function send() {
    if (pending || !code.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await submitInvite(code.trim().toUpperCase());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(true);
      setMsg(`تمام! ${res.inviterName} هياخد نقطه أول ما تخلّص أول مهمة 🎉`);
      playPoint();
    });
  }

  return (
    <section className="g-card p-4">
      <h3 className="font-bold text-white text-sm">🤝 اللعبة أحلى مع صحابك</h3>

      {state === "can-invite" && !sent ? (
        <>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            مين اللي علّمك اللعبة؟ اكتب كوده وهياخد{" "}
            <b className="text-amber-400">+{xp} نقطة</b> أول ما تخلّص أول مهمة ليك.
          </p>
          <div className="flex gap-2 mt-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              dir="ltr"
              placeholder="ABC123"
              aria-label="كود اللي علّمك اللعبة"
              className="grow bg-white/5 border border-white/20 px-3 py-2.5 text-center text-lg font-bold tracking-widest text-white focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={pending || code.trim().length < 4}
              className="shrink-0 bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold px-4 disabled:opacity-40"
            >
              {pending ? "..." : "تمام"}
            </button>
          </div>
          {error && <p className="text-sm font-bold text-red-300 mt-2">{error}</p>}
          <p className="text-[11px] text-slate-500 mt-2">
            مرة واحدة بس، ومش هينفع كودك إنت.
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {msg ??
            (state === "done" && inviterName
              ? `اللي علّمك اللعبة: ${inviterName} ✅`
              : "دلوقتي دورك: علّم صحابك وخد نقط على كل واحد يدخل بكودك.")}
        </p>
      )}

      {myCode && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-[11px] text-slate-500">كودك إنت</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="grow font-bold text-xl tracking-[0.3em] text-amber-400 tabular-nums"
              dir="ltr"
            >
              {myCode}
            </span>
            {share && (
              <a
                href={share}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-emerald-600 text-white text-xs font-bold px-3 py-2"
              >
                💬 ابعته لصاحبك
              </a>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            كل واحد يدخل اللعبة ويكتب كودك = <b className="text-amber-400">+{xp}</b> ليك.
          </p>
        </div>
      )}
    </section>
  );
}
