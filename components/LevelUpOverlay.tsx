"use client";

import { useEffect } from "react";
import { playLevelUp } from "@/lib/sound";

export default function LevelUpOverlay({
  level,
  rankName,
  reward,
  onClose,
}: {
  level: number;
  rankName: string;
  reward?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    playLevelUp();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([40, 60, 40, 60, 120]);
      } catch {
        // بعض الأجهزة بترفض — مش مشكلة
      }
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-5 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="g-card g-glow-gold w-full max-w-xs p-6 text-center animate-[levelup_0.5s_ease-out]">
        <p className="text-6xl mb-2">👑</p>
        <p className="text-[10px] tracking-[0.35em] text-amber-400 font-bold">
          LEVEL UP
        </p>
        <p className="font-bold text-5xl text-amber-400 tabular-nums my-1" dir="ltr">
          {String(level).padStart(2, "0")}
        </p>
        <p className="font-bold text-white text-lg">{rankName}</p>

        {reward && (
          <div className="mt-4 bg-amber-500/15 border border-amber-500/40 px-3 py-2.5">
            <p className="text-[11px] text-amber-300">فتحت</p>
            <p className="font-bold text-white text-sm mt-0.5">{reward}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 bg-amber-500 py-3 font-bold text-slate-950 hover:bg-amber-400 transition"
        >
          يلا نكمّل 🔥
        </button>
      </div>
    </div>
  );
}
