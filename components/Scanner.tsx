"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { identify, confirmCheckIn } from "@/app/check-in/actions";
import { identifyForEvent, scanForEvent } from "@/app/events/actions";
import type { ScanTarget, CheckInResult } from "@/lib/checkin";

/** لو اتبعت، المسح بيسجّل الحدث ده بدل حضور مدارس الأحد */
export type ScanEvent = {
  key: string;
  date: string;
  label: string;
  /** علامات زيادة الخادم بيعلّمها وهو بيمسح */
  bonuses?: { rule: string; label: string; emoji: string; xp: number }[];
};

type Phase = "idle" | "scanning" | "confirming" | "done" | "error";

export default function Scanner({ event }: { event?: ScanEvent } = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<ScanTarget | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  // الكود المكتوب بالإيد — لما الكاميرا ماتنفعش أو الكارت ضايع
  const [code, setCode] = useState("");
  // العلامات اللي الخادم علّمها للولد اللي قدامه دلوقتي
  const [ticks, setTicks] = useState<string[]>([]);

  const router = useRouter();
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastToken = useRef<string>("");

  async function stopCamera() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      // الكاميرا كانت مقفولة خلاص
    }
    scannerRef.current = null;
  }

  async function startCamera() {
    setError(null);
    setResult(null);
    setTarget(null);
    setPhase("scanning");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("reader", { verbose: false });
      scannerRef.current = scanner as unknown as typeof scannerRef.current;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (decoded === lastToken.current) return;
          lastToken.current = decoded;

          await stopCamera();
          await lookUp(decoded);
        },
        () => {
          // فريم من غير QR — عادي
        },
      );
    } catch {
      setError("مقدرناش نفتح الكاميرا. اسمح للمتصفح يستخدمها وجرّب تاني.");
      setPhase("error");
    }
  }

  /** بنشوف مين صاحب الكود — نفس الخطوة سواء اتمسح أو اتكتب */
  async function lookUp(token: string) {
    lastToken.current = token;
    setPhase("confirming");
    try {
      const found = event
        ? await identifyForEvent(event.key, event.date, token)
        : await identify(token);
      if (!found) {
        setError("الكود ده مش معروف — راجعه وجرّب تاني");
        setPhase("error");
        return;
      }
      setTarget(found);
      setTicks("bonuses" in found ? (found.bonuses as string[]) : []);
    } catch {
      setError("حصلت مشكلة في قراءة الكود");
      setPhase("error");
    }
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setCode("");
    void stopCamera();
    void lookUp(value);
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  async function confirm() {
    if (!target || busy) return;
    setBusy(true);
    try {
      const res = event
        ? await scanForEvent(event.key, event.date, lastToken.current, ticks)
        : await confirmCheckIn(lastToken.current);
      setResult(res);
      setPhase("done");
      if (res.status === "ok") {
        setCount((c) => c + 1);
        // الكشف اللي تحت يتحدّث على طول بالاسم اللي اتسجّل
        if (event) router.refresh();
      }
    } catch {
      setError("مقدرناش نسجّل الحضور");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    lastToken.current = "";
    void startCamera();
  }

  return (
    <div className="space-y-3">
      {count > 0 && (
        <p className="text-center text-sm font-bold text-green-700 bg-green-50 border border-green-300 rounded-xl py-2">
          ✅ سجّلت {count} {event ? `في ${event.label}` : "النهارده"}
        </p>
      )}

      {/* الكاميرا */}
      <div className={phase === "scanning" ? "" : "hidden"}>
        <div id="reader" className="rounded-2xl overflow-hidden bg-black" />
        <p className="text-center text-sm text-slate-500 mt-2">
          وجّه الكاميرا على كود الولد
        </p>
        <button
          type="button"
          onClick={() => {
            void stopCamera();
            setPhase("idle");
          }}
          className="w-full mt-2 rounded-xl border border-slate-300 py-2.5 font-bold text-slate-600"
        >
          إيقاف
        </button>
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="w-full rounded-2xl bg-brand-600 py-5 text-white font-bold text-lg hover:bg-brand-700 transition"
        >
          📷 افتح الكاميرا
        </button>
      )}

      {/* الكود بالإيد — الكارت ضايع أو الكاميرا مش راضية تفتح */}
      {(phase === "idle" || phase === "error") && (
        <form onSubmit={submitCode} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="أو اكتب كود الولد"
            dir="ltr"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            className="grow rounded-xl border border-slate-300 px-3 py-3 text-center font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:font-sans focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="shrink-0 rounded-xl bg-slate-800 px-5 font-bold text-white disabled:opacity-40"
          >
            دوّر
          </button>
        </form>
      )}

      {phase === "confirming" && !target && (
        <p className="text-center py-8 text-slate-500">بنشوف مين ده...</p>
      )}

      {/* تأكيد الهوية */}
      {phase === "confirming" && target && (
        <div className="bg-white rounded-2xl border-2 border-brand-400 p-5 text-center">
          <p className="text-xs text-slate-400">اتأكد إن ده هو</p>
          <h2 className="font-bold text-2xl text-brand-900 mt-1">
            {target.fullName}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {[target.area, target.stage].filter(Boolean).join(" — ")}
          </p>
          {target.servants.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              خادمه: {target.servants.join(" • ")}
            </p>
          )}

          {event?.bonuses && event.bonuses.length > 0 && (
            <div className="mt-4 space-y-1.5 text-start">
              {event.bonuses.map((b) => {
                const on = ticks.includes(b.rule);
                return (
                  <button
                    key={b.rule}
                    type="button"
                    onClick={() =>
                      setTicks((t) =>
                        on ? t.filter((r) => r !== b.rule) : [...t, b.rule],
                      )
                    }
                    aria-pressed={on}
                    className={`w-full flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${
                      on
                        ? "bg-violet-50 border-violet-500"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-lg border-2 grid place-content-center text-sm ${
                        on
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "bg-white border-slate-300 text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span
                      className={`grow text-start font-bold text-sm ${
                        on ? "text-violet-900" : "text-slate-600"
                      }`}
                    >
                      {b.emoji} {b.label}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-violet-700 tabular-nums">
                      +{b.xp}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {target.alreadyHere && !(event?.bonuses && event.bonuses.length > 0) ? (
            <p className="mt-4 bg-amber-50 border border-amber-300 rounded-xl py-3 font-bold text-amber-900">
              {event ? `متسجّل خلاص في ${event.label}` : "إنت حاضر بالفعل يا بطل!"}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="w-full mt-4 rounded-xl bg-green-600 py-3.5 text-white font-bold text-lg hover:bg-green-700 disabled:opacity-60 transition"
            >
              {busy ? "بيتسجّل..." : target.alreadyHere ? "✅ احفظ العلامات" : "✅ أيوة، سجّل حضوره"}
            </button>
          )}

          <button
            type="button"
            onClick={next}
            className="w-full mt-2 rounded-xl border border-slate-300 py-2.5 font-bold text-slate-600"
          >
            {target.alreadyHere ? "التالي" : "مش هو — امسح تاني"}
          </button>
        </div>
      )}

      {/* النتيجة */}
      {phase === "done" && result && (
        <div
          className={`rounded-2xl p-6 text-center ${
            result.status === "ok"
              ? "bg-linear-to-b from-green-500 to-green-700 text-white"
              : "bg-amber-50 border border-amber-300"
          }`}
        >
          {result.status === "ok" ? (
            <>
              <p className="text-5xl mb-2">{result.rankedUp ? "👑" : "🔥"}</p>
              <p className="font-bold text-xl">عاش يا {result.name}!</p>
              <p className="text-3xl font-bold mt-2 tabular-nums">
                +{result.xp} نقطة
              </p>
              <p className="text-sm opacity-90 mt-1">
                رصيده بقى {result.totalXp}
              </p>

              {result.rankedUp && (
                <div className="mt-4 bg-white/20 rounded-xl py-3">
                  <p className="text-sm">يا نهار أبيض! رتبة جديدة 🎉</p>
                  <p className="font-bold text-lg">{result.rankName}</p>
                </div>
              )}

              {!result.rankedUp && result.nextRank && (
                <p className="text-xs opacity-80 mt-3">
                  فاضل {result.toNext} نقطة على {result.nextRank}
                </p>
              )}
            </>
          ) : result.status === "already" ? (
            <>
              <p className="text-4xl mb-2">👍</p>
              <p className="font-bold text-amber-900">
                {result.name} حاضر بالفعل — النقط اتحسبت قبل كده
              </p>
            </>
          ) : (
            <p className="font-bold text-amber-900">الكود مش معروف</p>
          )}

          <button
            type="button"
            onClick={next}
            className={`w-full mt-5 rounded-xl py-3 font-bold ${
              result.status === "ok"
                ? "bg-white text-green-800"
                : "bg-brand-600 text-white"
            }`}
          >
            📷 الولد اللي بعده
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-5 text-center">
          <p className="font-bold text-red-800">{error}</p>
          <button
            type="button"
            onClick={next}
            className="w-full mt-4 rounded-xl bg-brand-600 py-3 text-white font-bold"
          >
            جرّب تاني
          </button>
        </div>
      )}
    </div>
  );
}
