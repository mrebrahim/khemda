"use client";

import { useState } from "react";

export default function CopyBox({
  text,
  label = "انسخ",
  compact,
}: {
  text: string;
  label?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // متصفحات قديمة أو اتصال مش آمن
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy failed");
      }
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const button = (
    <button
      type="button"
      onClick={copy}
      className={`rounded-xl font-bold transition ${
        compact
          ? "text-xs px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-300 hover:bg-brand-100"
          : "w-full py-3 bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {state === "done" ? "✅ اتنسخ" : state === "failed" ? "⚠️ انسخه بإيدك" : `📋 ${label}`}
    </button>
  );

  if (compact) return button;

  return (
    <div className="space-y-2">
      {button}
      <textarea
        readOnly
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        rows={Math.min(24, text.split("\n").length + 1)}
        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-brand-500"
      />
      {state === "failed" && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          المتصفح رفض النسخ التلقائي. اضغط على النص فوق — هيتحدّد كله — وبعدين انسخه.
        </p>
      )}
    </div>
  );
}
