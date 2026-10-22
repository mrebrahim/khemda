"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { currentQr, type QrFrame } from "@/app/lucky/actions";

/**
 * الكود بيتغيّر كل دقيقة. بنجيب كود جديد من السيرفر أول ما
 * الحالي يخلص، فاللي يصوّر الشاشة الكود بتاعه بيبوظ بسرعة.
 */
export default function LuckyQr({ eventId }: { eventId: number }) {
  const [frame, setFrame] = useState<QrFrame>(null);
  const [left, setLeft] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const f = await currentQr(eventId);
      if (!f) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setFrame(f);
      setLeft(f.seconds);
    } catch {
      setFailed(true);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (left === 0 && frame) void load();
  }, [left, frame, load]);

  if (failed) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center">
        <p className="font-bold text-amber-900">الكود مش شغّال</p>
        <p className="text-sm text-amber-800 mt-1.5 leading-relaxed">
          شغّل الحدث الأول، واتأكد إن متغيّر البيئة{" "}
          <code className="font-mono text-xs" dir="ltr">
            STUDENT_SESSION_SECRET
          </code>{" "}
          متظبّط.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 text-center">
      <div className="aspect-square max-w-[420px] mx-auto grid place-content-center">
        {frame ? (
          <Image
            src={frame.image}
            alt="كود صندوق الحظ"
            width={420}
            height={420}
            unoptimized
            priority
            className="w-full h-auto"
          />
        ) : (
          <p className="text-slate-400">بنجهّز الكود…</p>
        )}
      </div>

      <div className="mt-3">
        <div className="h-2 bg-slate-200 overflow-hidden rounded-full">
          <div
            className="h-full bg-brand-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(left / Math.max(1, frame?.window ?? 60)) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
          الكود بيتغيّر بعد {left} ثانية
        </p>
      </div>
    </div>
  );
}
