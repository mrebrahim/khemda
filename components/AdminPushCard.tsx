"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "idle" | "granted" | "denied" | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** المشرف بيشغّل تنبيهات الخدمة على موبايله */
export default function AdminPushCard({
  heading = "🔔 أفكّرك كل يوم ٧ بالليل؟",
  body = "أول ما المهمات تفتح، يجي لك تنبيه على الموبايل فيه رابط الصفحة دي جاهزة بتصميم اليوم.",
  button = "فكّرني كل يوم",
  doneTitle = "🔔 التذكير شغّال — هيوصلك كل يوم ٧ بالليل",
  doneBody = "التنبيه هيفتح لك الصفحة دي على طول عشان تنزّل البوست.",
}: {
  heading?: string;
  body?: string;
  button?: string;
  doneTitle?: string;
  doneBody?: string;
} = {}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "granted") setState("granted");
    else if (Notification.permission === "denied") setState("denied");
  }, []);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
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

      const res = await fetch("/api/push/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("مقدرناش نحفظ الاشتراك");

      setState("granted");
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "حصلت مشكلة");
    }
  }

  if (state === "unsupported") return null;

  if (state === "granted") {
    return (
      <section className="bg-green-50 border border-green-300 rounded-2xl p-3.5">
        <p className="font-bold text-green-800 text-sm">{doneTitle}</p>
        <p className="text-xs text-green-700 mt-1">{doneBody}</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="bg-slate-100 border border-slate-300 rounded-2xl p-3.5">
        <p className="text-sm text-slate-700 leading-relaxed">
          التنبيهات مقفولة من إعدادات المتصفح. افتحها عشان نفكّرك كل يوم
          تنزّل البوست.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
      <h2 className="font-bold text-amber-900">{heading}</h2>
      <p className="text-sm text-amber-800 mt-1 leading-relaxed">{body}</p>
      <button
        type="button"
        onClick={enable}
        disabled={state === "working"}
        className="mt-3 w-full rounded-xl bg-amber-600 text-white font-bold py-2.5 hover:bg-amber-700 disabled:opacity-60 transition"
      >
        {state === "working" ? "ثانية..." : button}
      </button>
      {error && <p className="text-red-700 text-xs mt-2">{error}</p>}
    </section>
  );
}
