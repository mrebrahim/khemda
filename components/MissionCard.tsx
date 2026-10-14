"use client";

import { useState, useTransition } from "react";
import { completeMission } from "@/app/hero/actions";

export default function MissionCard({
  code,
  title,
  detail,
  xp,
  done: initialDone,
  emoji,
}: {
  code: "prayer" | "bible";
  title: string;
  detail: string;
  xp: number;
  done: boolean;
  emoji: string;
}) {
  const [done, setDone] = useState(initialDone);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (done || pending) return;
    setDone(true); // رد فعل فوري
    startTransition(async () => {
      try {
        const res = await completeMission(code);
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        let m = `+${res.xp} نقطة! 🔥`;
        if (res.milestone) m = `سلسلة ${res.milestone} يوم! مكافأة إضافية! 🏆`;
        else if (res.usedFreeze) m = `+${res.xp} نقطة — واستخدمنا تجميدة عشان سلسلتك متقطعش ❄️`;
        setMsg(m);
      } catch {
        setDone(false);
        setMsg("حصلت مشكلة، جرّب تاني");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={done || pending}
      aria-pressed={done}
      className={`w-full text-right rounded-2xl border-2 p-4 transition ${
        done
          ? "bg-green-50 border-green-400"
          : "bg-white border-slate-200 hover:border-brand-400 active:scale-[0.99]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl shrink-0">{done ? "✅" : emoji}</span>
        <div className="grow min-w-0">
          <p className={`font-bold ${done ? "text-green-800" : "text-slate-800"}`}>
            {title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
        </div>
        <span
          className={`shrink-0 text-sm font-bold rounded-full px-3 py-1 ${
            done ? "bg-green-200 text-green-900" : "bg-brand-100 text-brand-800"
          }`}
        >
          +{xp}
        </span>
      </div>

      {msg && (
        <p className="mt-2.5 text-sm font-bold text-green-800 bg-green-100 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}
      {!done && !msg && (
        <p className="mt-2.5 text-xs text-brand-700 font-bold">اضغط لما تخلّصها 👆</p>
      )}
    </button>
  );
}
