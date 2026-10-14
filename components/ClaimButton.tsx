"use client";

import { useState, useTransition } from "react";
import { claimReward } from "@/app/hero/actions";
import { playUnlock } from "@/lib/sound";

export default function ClaimButton({ level }: { level: number }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
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
        ✅ طلبك وصل للمشرف
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className="w-full mt-3 bg-amber-500 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition"
      >
        {pending ? "ثانية..." : "🎁 اطلب هديتك"}
      </button>
      {state === "error" && msg && (
        <p className="text-amber-300 text-xs mt-2 text-center">{msg}</p>
      )}
    </>
  );
}
