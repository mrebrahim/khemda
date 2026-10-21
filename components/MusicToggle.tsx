"use client";

import { useEffect, useState } from "react";
import { isPlaying, musicOn, setMusic, startMusic, stopMusic } from "@/lib/music";

/**
 * زرار الموسيقى. المتصفحات مش بتسمح بتشغيل صوت من غير ما المستخدم
 * يلمس الشاشة، فلو كان مشغّلها قبل كده بنستنى أول لمسة ونبدأ.
 */
export default function MusicToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  /** نسخة صغيرة بالأيقونة بس — للهيدر */
  compact?: boolean;
}) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const want = musicOn();
    setOn(want);
    setReady(true);
    if (!want) return;

    const kick = () => {
      void startMusic();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });

    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      stopMusic();
    };
  }, []);

  async function toggle() {
    if (on || isPlaying()) {
      stopMusic();
      setMusic(false);
      setOn(false);
      return;
    }
    const ok = await startMusic();
    setMusic(ok);
    setOn(ok);
  }

  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={on}
      aria-label={on ? "اقفل الموسيقى" : "شغّل موسيقى الحماس"}
      title={on ? "اقفل الموسيقى" : "شغّل موسيقى الحماس"}
      className={`inline-flex items-center gap-1.5 border text-xs font-bold transition ${
        compact ? "px-2 py-1" : "px-2.5 py-1.5"
      } ${
        on
          ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
          : "bg-white/10 border-white/20 text-slate-300 hover:bg-white/20"
      } ${className}`}
    >
      <span aria-hidden="true">{on ? "🎵" : "🎧"}</span>
      {!compact && (on ? "الموسيقى شغّالة" : "شغّل الموسيقى")}
    </button>
  );
}
