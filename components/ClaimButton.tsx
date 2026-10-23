"use client";

import { useState, useTransition } from "react";
import { claimReward } from "@/app/hero/actions";
import { playUnlock } from "@/lib/sound";

/**
 * زرار أخد الهدية.
 *
 * الخصم مش بيترد، فالولد بيشوف خطوة تأكيد فيها السعر والرصيد
 * اللي هيفضل — مش دوسة واحدة وتروح ٥٠٠ نقطة.
 */
export default function ClaimButton({
  level,
  cost,
  after,
}: {
  /** مفتاح الهدية في المحل */
  level: number;
  cost: number;
  /** الرصيد اللي هيفضل بعد الخصم */
  after: number;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function claim() {
    if (pending || state === "sent") return;
    startTransition(async () => {
      try {
        const res = await claimReward(level);
        if (!res.ok) {
          setMsg(res.error);
          setState("error");
          return;
        }
        playUnlock();
        setState("sent");
      } catch {
        setMsg("حصلت مشكلة، جرّب تاني");
        setState("error");
      }
    });
  }

  if (state === "sent") {
    return (
      <p className="w-full mt-3 bg-emerald-500/15 border border-emerald-500/40 py-2.5 text-center font-bold text-emerald-300 text-sm">
        ✅ طلبك وصل للمشرف ونقطك اتخصمت
      </p>
    );
  }

  if (state === "confirm") {
    return (
      <div className="mt-3 border border-amber-500/50 bg-amber-500/10 p-3">
        <p className="text-sm font-bold text-amber-200 text-center leading-relaxed">
          متأكد؟ هيتخصم منك <span className="tabular-nums">{cost}</span> نقطة
          <br />
          <span className="text-[12px] font-normal text-slate-300">
            ومستواك هينزل — هيفضل معاك{" "}
            <span className="tabular-nums font-bold">{after}</span>
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={claim}
            disabled={pending}
            className="bg-amber-500 py-2.5 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition"
          >
            {pending ? "ثانية..." : "أيوة، خدها"}
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="border border-white/25 py-2.5 font-bold text-slate-300"
          >
            لسه
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setState("confirm")}
        className="w-full mt-3 bg-amber-500 py-3 font-bold text-slate-950 hover:bg-amber-400 transition"
      >
        🎁 خدها بـ{cost} نقطة
      </button>
      {state === "error" && msg && (
        <p className="text-amber-300 text-xs mt-2 text-center">{msg}</p>
      )}
    </>
  );
}
