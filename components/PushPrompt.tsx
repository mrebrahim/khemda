"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "idle" | "granted" | "denied" | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushPrompt() {
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

      const res = await fetch("/api/push/subscribe", {
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
      <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-3 text-center">
        <p className="text-green-300 text-sm font-bold">
          🔔 التنبيهات شغّالة — هنفكّرك كل يوم
        </p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
        <p className="text-white/70 text-xs">
          التنبيهات مقفولة من إعدادات المتصفح. افتحها عشان نفكّرك بمهماتك.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-400/15 border border-yellow-400/40 rounded-2xl p-4 text-center">
      <p className="text-3xl mb-1.5">🔔</p>
      <p className="font-bold text-white">خلّينا نفكّرك كل يوم؟</p>
      <p className="text-xs text-white/70 mt-1 mb-3">
        تنبيه واحد في اليوم عشان سلسلتك متقطعش
      </p>
      <button
        type="button"
        onClick={enable}
        disabled={state === "working"}
        className="w-full rounded-xl bg-yellow-400 py-2.5 font-bold text-yellow-950 hover:bg-yellow-300 disabled:opacity-60 transition"
      >
        {state === "working" ? "ثانية..." : "أيوة فكّرني"}
      </button>
      {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
    </div>
  );
}
