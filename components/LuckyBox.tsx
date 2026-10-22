"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { openDrop, type DropResult } from "@/app/hero/drop/actions";
import { playPoint } from "@/lib/sound";

type Phase = "ready" | "opening" | "done";

/** صندوق الحظ: دوسة واحدة، وأنيميشن، وبعدين الجايزة */
export default function LuckyBox({
  title,
  left,
  previous,
  solved,
  onOpened,
}: {
  title: string;
  left: number;
  /** لو فتح قبل كده بنوريه نفس النتيجة */
  previous: { label: string; kind: string; xp: number; taayo: number } | null;
  /** تصريح التحدي — من غيره السيرفر مش هيفتح */
  solved: string;
  onOpened?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(previous ? "done" : "ready");
  const [prize, setPrize] = useState(previous);
  const [error, setError] = useState<string | null>(null);

  // نفس المفتاح طول الجلسة: لو الطلب اتبعت مرتين بياخد نفس الجايزة
  const idem = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `k${Date.now()}${Math.random().toString(36).slice(2)}`,
  );

  async function open() {
    if (phase !== "ready") return;
    setError(null);
    setPhase("opening");

    // الأنيميشن بيمشي مع الطلب، مش قبله — عشان النتيجة تكون مضمونة
    const [res] = await Promise.all([
      openDrop(idem.current, solved),
      new Promise((r) => setTimeout(r, 2200)),
    ]);

    if (!res.ok) {
      setError(res.error);
      setPhase("ready");
      return;
    }
    setPrize({ label: res.label, kind: res.kind, xp: res.xp, taayo: res.taayo });
    setPhase("done");
    playPoint();
    onOpened?.();
  }

  if (phase === "done" && prize) {
    return (
      <div className="b-frame p-6 text-center" style={{ borderColor: "rgba(242,169,0,.7)" }}>
        <p className="text-6xl mb-2 motion-safe:animate-bounce">🎉</p>
        <p className="font-bold text-amber-300 text-xl">مبروووك يا أسطورة! 👑</p>

        <div className="my-5 py-5 border-y border-white/10">
          <p className="text-3xl font-bold text-white leading-snug">{prize.label}</p>
          {prize.kind === "xp" && prize.xp > 0 && (
            <p className="text-sm text-emerald-400 font-bold mt-2">
              نقطك زادت — قربت من الليفل الجديد!
            </p>
          )}
          {prize.kind === "taayo" && (
            <p className="text-sm text-amber-200 mt-2 leading-relaxed">
              روح للخادم عشان يسلّمك جايزتك ✋
              <br />
              <span className="text-slate-400 text-xs">الجايزة متسجّلة باسمك</span>
            </p>
          )}
          {prize.kind === "badge" && (
            <p className="text-sm text-violet-300 font-bold mt-2">
              الشارة دخلت مقتنياتك ✨
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/hero"
            className="bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-3"
          >
            شوف تقدّمك
          </Link>
          <Link href="/board" className="border-2 border-white/25 text-white font-bold py-3">
            لوحة الأبطال
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="b-frame p-6 text-center" style={{ borderColor: "rgba(242,169,0,.5)" }}>
      <p className="text-xs text-slate-400">{title}</p>
      <p className="font-bold text-white text-lg mt-1">الصندوق الأسطوري مستنيك!</p>

      <div className="my-6 flex justify-center">
        <span
          className={`text-[90px] leading-none select-none ${
            phase === "opening" ? "lucky-shake" : "motion-safe:animate-pulse"
          }`}
          aria-hidden="true"
        >
          🎁
        </span>
      </div>

      {phase === "opening" ? (
        <p className="font-bold text-amber-300">بنفتح الصندوق… 🔓</p>
      ) : (
        <>
          <p className="text-sm text-slate-300">جاهز تكتشف مكافأتك؟</p>
          <p className="text-[11px] text-slate-500 mt-1">
            معاك <span className="tabular-nums">{left}</span> فتحة
          </p>
          <button
            type="button"
            onClick={open}
            className="mt-5 w-full bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-4 text-lg"
          >
            افتح صندوقك 🎁
          </button>
        </>
      )}

      {error && <p className="mt-4 text-sm font-bold text-red-300">{error}</p>}
    </div>
  );
}
