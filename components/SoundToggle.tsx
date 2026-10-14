"use client";

import { useEffect, useState } from "react";
import { setSound, soundOn } from "@/lib/sound";

export default function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => setOn(soundOn()), []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setOn(next);
        setSound(next);
      }}
      aria-label={on ? "اقفل الصوت" : "افتح الصوت"}
      className="text-sm bg-white/10 border border-white/15 px-2.5 py-1.5 hover:bg-white/20 transition"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
