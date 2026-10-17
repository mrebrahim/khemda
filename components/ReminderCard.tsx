"use client";

import { useEffect, useState, useTransition } from "react";
import { saveReminderPrefs } from "@/app/hero/actions";
import type { ReminderPrefs } from "@/lib/habits";

type PushState = "unsupported" | "idle" | "granted" | "denied" | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** هل التطبيق متسطّب على الشاشة الرئيسية؟ (مهم جدًا على الآيفون) */
function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error خاصية بتاعة iOS بس
    window.navigator.standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function ReminderCard({ prefs }: { prefs: ReminderPrefs }) {
  const [push, setPush] = useState<PushState>("idle");
  const [needsInstall, setNeedsInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(prefs);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      // الآيفون مابيدعمش الإشعارات غير لما التطبيق يتسطّب على الشاشة
      setPush("unsupported");
      setNeedsInstall(typeof navigator !== "undefined" && isIOS() && !isInstalled());
      return;
    }
    if (Notification.permission === "granted") setPush("granted");
    else if (Notification.permission === "denied") setPush("denied");
  }, []);

  async function enablePush() {
    setError(null);
    setPush("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "idle");
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("مفتاح الإشعارات ناقص");

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("مقدرناش نحفظ الاشتراك");

      setPush("granted");
      save({ reminders_on: true });
    } catch (e) {
      setPush("idle");
      setError(e instanceof Error ? e.message : "حصلت مشكلة");
    }
  }

  function save(patch: Parameters<typeof saveReminderPrefs>[0]) {
    setLocal((p) => ({
      ...p,
      ...(patch.slot ? { slot: patch.slot } : {}),
      ...(patch.daily_goal ? { daily_goal: patch.daily_goal } : {}),
      ...(typeof patch.reminders_on === "boolean"
        ? { reminders_on: patch.reminders_on }
        : {}),
      ...(typeof patch.pause_days === "number"
        ? { paused_until: patch.pause_days === 0 ? null : "…" }
        : {}),
    }));
    startTransition(async () => {
      await saveReminderPrefs(patch);
    });
  }

  const paused = Boolean(local.paused_until);

  return (
    <section className="b-frame p-4" aria-label="التذكير اليومي">
      <h2 className="sec-title font-bold text-white text-sm mb-1">🔔 فكّرني كل يوم</h2>
      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        تنبيه واحد في الميعاد اللي تختاره، وتنبيه أخير بس لو سلسلتك على وشك تقطع.
      </p>

      {/* تشغيل الإشعارات */}
      {push === "granted" ? (
        <p className="text-[13px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-2 text-center">
          ✅ الإشعارات شغّالة على الموبايل ده
        </p>
      ) : push === "denied" ? (
        <p className="text-[12px] text-slate-300 bg-white/5 border border-white/10 py-2 px-3 leading-relaxed">
          الإشعارات مقفولة من إعدادات المتصفح. افتحها من إعدادات الموقع عشان
          نقدر نفكّرك.
        </p>
      ) : needsInstall ? (
        <div className="text-[12px] text-slate-300 bg-white/5 border border-white/10 py-2.5 px-3 leading-relaxed">
          <b className="text-white">عشان تيجي لك التنبيهات على الآيفون:</b>
          <br />
          افتح زرار المشاركة <span dir="ltr">⬆️</span> تحت، واختار{" "}
          <b className="text-amber-300">«إضافة إلى الشاشة الرئيسية»</b>، وبعدين
          افتح التطبيق من الأيقونة وشغّل التنبيهات من هنا.
        </div>
      ) : push === "unsupported" ? (
        <p className="text-[12px] text-slate-400 leading-relaxed">
          المتصفح ده مابيدعمش التنبيهات. جرّب من كروم على الموبايل.
        </p>
      ) : (
        <button
          type="button"
          onClick={enablePush}
          disabled={push === "working"}
          className="w-full bg-linear-to-l from-amber-500 to-amber-400 text-slate-950 font-bold py-2.5 text-sm hover:brightness-110 disabled:opacity-60 transition"
        >
          {push === "working" ? "ثانية..." : "🔔 شغّل التنبيهات"}
        </button>
      )}
      {error && <p className="text-red-300 text-xs mt-2">{error}</p>}

      {/* الميعاد */}
      <p className="text-[11px] text-slate-400 mt-4 mb-1.5">نفكّرك إمتى؟</p>
      <div className="grid grid-cols-2 gap-2">
        <Choice
          on={local.slot === "morning"}
          onClick={() => save({ slot: "morning" })}
          disabled={pending}
          label="أول ما تفتح"
          hint="٧ الصبح"
        />
        <Choice
          on={local.slot === "night"}
          onClick={() => save({ slot: "night" })}
          disabled={pending}
          label="قبل ما أنام"
          hint="بالليل"
        />
      </div>

      {/* الهدف اليومي */}
      <p className="text-[11px] text-slate-400 mt-3 mb-1.5">هدفك اليومي؟</p>
      <div className="grid grid-cols-2 gap-2">
        <Choice
          on={local.daily_goal === 1}
          onClick={() => save({ daily_goal: 1 })}
          disabled={pending}
          label="مهمة واحدة"
          hint="الأهم إني ما أقطعش"
        />
        <Choice
          on={local.daily_goal === 2}
          onClick={() => save({ daily_goal: 2 })}
          disabled={pending}
          label="المهمتين"
          hint="مستوى البطل 🔥"
        />
      </div>

      {/* وقف مؤقت */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10">
        <span className="text-[11px] text-slate-400">
          {paused ? "التذكير متوقّف مؤقتًا" : "مسافر أو مشغول؟"}
        </span>
        <button
          type="button"
          onClick={() => save({ pause_days: paused ? 0 : 3 })}
          disabled={pending}
          className="text-[11px] font-bold text-amber-300 border border-amber-500/40 px-3 py-1.5 hover:bg-amber-500/10 transition disabled:opacity-60"
        >
          {paused ? "رجّع التذكير" : "وقّفه ٣ أيام"}
        </button>
      </div>
    </section>
  );
}

function Choice({
  on,
  onClick,
  disabled,
  label,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`b-tab p-2.5 text-center border disabled:opacity-60 ${
        on
          ? "border-amber-400 bg-amber-500/15"
          : "border-white/12 bg-white/5 hover:border-amber-500/50"
      }`}
    >
      <span className={`block text-[13px] font-bold ${on ? "text-amber-300" : "text-white"}`}>
        {label}
      </span>
      <span className="block text-[10px] text-slate-400 mt-0.5">{hint}</span>
    </button>
  );
}
