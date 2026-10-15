"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { completeMission } from "@/app/hero/actions";
import { playPoint } from "@/lib/sound";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { GFX } from "@/lib/assets";

export default function MissionCard({
  code,
  title,
  detail,
  xp,
  done: initialDone,
  emoji,
  icon,
}: {
  code: "prayer" | "bible";
  title: string;
  detail: string;
  xp: number;
  done: boolean;
  emoji: string;
  /** أيقونة WebP اختيارية — لو مابعتهاش بيستخدم الإيموجي */
  icon?: string;
}) {
  const [done, setDone] = useState(initialDone);
  const [msg, setMsg] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<{
    level: number;
    rankName: string;
    reward: string | null;
  } | null>(null);
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
        if (res.milestone) m = `🏆 سلسلة ${res.milestone} يوم! مكافأة إضافية!`;
        else if (res.usedFreeze) m = `+${res.xp} ❄️ استخدمنا تجميدة عشان سلسلتك متقطعش`;
        setMsg(m);

        if (res.leveledUp) {
          setLevelUp({
            level: res.level,
            rankName: res.rankName,
            reward: res.reward,
          });
        } else {
          playPoint();
        }
      } catch {
        setDone(false);
        setMsg("حصلت مشكلة، جرّب تاني");
      }
    });
  }

  return (
    <>
    {levelUp && (
      <LevelUpOverlay
        level={levelUp.level}
        rankName={levelUp.rankName}
        reward={levelUp.reward}
        onClose={() => setLevelUp(null)}
      />
    )}
    <button
      type="button"
      onClick={run}
      disabled={done || pending}
      aria-pressed={done}
      className={`b-frame w-full text-right p-4 transition active:scale-[0.99] ${
        done ? "" : "mission-live hover:brightness-110"
      }`}
      style={{ borderColor: done ? "rgba(34,197,94,.6)" : "rgba(242,169,0,.5)" }}
    >
      <div className="flex items-center gap-3">
        {icon && !done ? (
          <Image
            src={icon}
            alt=""
            width={128}
            height={128}
            aria-hidden="true"
            className="w-11 h-11 shrink-0 object-contain"
          />
        ) : (
          <span className="text-3xl shrink-0">{done ? "✅" : emoji}</span>
        )}

        <div className="grow min-w-0">
          <p className={`font-bold text-[15px] ${done ? "text-emerald-400" : "text-white"}`}>
            {title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
        </div>

        <span
          className={`shrink-0 flex items-center gap-1 font-bold px-2 py-1 text-sm border ${
            done
              ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
              : "text-amber-400 border-amber-500/40 bg-amber-500/10"
          }`}
          dir="ltr"
        >
          <Image
            src={GFX.xpGold}
            alt=""
            width={96}
            height={96}
            aria-hidden="true"
            className="w-4 h-4 object-contain"
          />
          +{xp}
        </span>
      </div>

      {msg && (
        <p className="mt-3 text-sm font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-2">
          {msg}
        </p>
      )}
      {!done && !msg && (
        <p className="mt-3 text-center text-[13px] font-bold text-slate-950 bg-linear-to-l from-amber-500 to-amber-400 py-2">
          👆 دوس هنا لما تخلّصها
        </p>
      )}
    </button>
    </>
  );
}
