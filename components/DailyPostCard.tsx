"use client";

import { useRef, useState } from "react";
import type { DailyPost } from "@/lib/daily-post";

const MEDAL = ["🥇", "🥈", "🥉"];

/** تصميم البوست — SVG مربّع ١٠٨٠ عشان يتنزّل صورة ويتبعت على الجروب */
function PostSvg({ post }: { post: DailyPost }) {
  const rows = post.isFriday
    ? [
        { icon: "🏫", label: "حضور الخدمة", xp: 20 },
        { icon: "⛪", label: "حضور القداس", xp: 15 },
        { icon: "🍞", label: "التناول", xp: 5 },
      ]
    : [
        { icon: "🙏", label: "الصلاة اليومية", xp: post.prayerXp },
        { icon: "📖", label: "إصحاح من الكتاب", xp: post.bibleXp },
      ];

  // قسم المتصدّرين بيبدأ تحت آخر مهمة — التخطيط بيتظبط لوحده
  const headY = 330 + rows.length * 120 + 48;
  // العنوان الطويل بيصغّر شوية عشان ما يخرجش بره الصورة
  const headlineSize = post.headline.length > 20 ? 64 : 78;

  return (
    <svg
      viewBox="0 0 1080 1080"
      width="1080"
      height="1080"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="تصميم البوست اليومي"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="8%" r="75%">
          <stop offset="0%" stopColor="#f2a900" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#070a0f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="55%" stopColor="#ffc23d" />
          <stop offset="100%" stopColor="#e08a00" />
        </linearGradient>
        <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e08a00" />
          <stop offset="100%" stopColor="#ffc23d" />
        </linearGradient>
      </defs>

      <rect width="1080" height="1080" fill="#070a0f" />
      <rect width="1080" height="1080" fill="url(#glow)" />

      {/* شبكة معدنية خفيفة */}
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={(i + 1) * 83}
          y1="0"
          x2={(i + 1) * 83}
          y2="1080"
          stroke="#ffffff"
          strokeOpacity="0.035"
        />
      ))}

      <text
        x="540"
        y="110"
        textAnchor="middle"
        fill="#f2a900"
        fontSize="34"
        fontWeight="bold"
        letterSpacing="14"
        style={{ direction: "rtl" }}
      >
        أبطال المهمة
      </text>

      <text
        x="540"
        y="215"
        textAnchor="middle"
        fill="url(#gold)"
        fontSize={headlineSize}
        fontWeight="bold"
        style={{ direction: "rtl" }}
      >
        {post.headline}
      </text>

      <rect x="330" y="255" width="420" height="4" fill="url(#bar)" />

      {/* المهمات */}
      {rows.map((r, i) => {
        const y = 330 + i * 120;
        return (
          <g key={r.label}>
            <rect
              x="110"
              y={y}
              width="860"
              height="96"
              fill="#151a22"
              stroke="#f2a90055"
              strokeWidth="2"
              rx="8"
            />
            <text x="902" y={y + 64} textAnchor="middle" fontSize="52">
              {r.icon}
            </text>
            {/* في RTL الـstart هو الناحية اليمين */}
            <text
              x="845"
              y={y + 62}
              textAnchor="start"
              fill="#ffffff"
              fontSize="44"
              fontWeight="bold"
              style={{ direction: "rtl" }}
            >
              {r.label}
            </text>
            <text
              x="160"
              y={y + 63}
              textAnchor="start"
              fill="#ffc23d"
              fontSize="48"
              fontWeight="bold"
              style={{ direction: "ltr" }}
            >
              +{r.xp}
            </text>
          </g>
        );
      })}

      {/* المتصدّرين */}
      {post.top3.length > 0 && (
        <g>
          <text
            x="540"
            y={headY}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="32"
            fontWeight="bold"
            style={{ direction: "rtl" }}
          >
            🏆 المتصدّرين دلوقتي
          </text>
          {post.top3.map((t, i) => (
            <text
              key={t.name}
              x="540"
              y={headY + 52 + i * 48}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="37"
              fontWeight="bold"
              style={{ direction: "rtl" }}
            >
              {MEDAL[i]} {t.name} — {t.xp} نقطة
            </text>
          ))}
        </g>
      )}

      {/* الحماس */}
      <text
        x="540"
        y="940"
        textAnchor="middle"
        fill="#ffc23d"
        fontSize="42"
        fontWeight="bold"
        style={{ direction: "rtl" }}
      >
        🔥 {post.hype}
      </text>

      {/* الدعوة */}
      <rect x="140" y="965" width="800" height="78" fill="url(#bar)" rx="8" />
      <text
        x="540"
        y="1018"
        textAnchor="middle"
        fill="#190f00"
        fontSize="44"
        fontWeight="bold"
        style={{ direction: "rtl" }}
      >
        ادخل بالكود اللي على كارتك 🎫
      </text>
    </svg>
  );
}

export default function DailyPostCard({
  post,
  shareUrl,
}: {
  post: DailyPost;
  shareUrl: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const svg = box.current?.querySelector("svg");
      if (!svg) throw new Error("التصميم لسه بيحمّل");

      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("مقدرناش نحوّل التصميم لصورة"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("المتصفح مش داعم");
      ctx.drawImage(img, 0, 0, 1080, 1080);
      URL.revokeObjectURL(url);

      const png = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png"),
      );
      if (!png) throw new Error("مقدرناش نحفظ الصورة");

      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = `ابطال-المهمة-${post.date}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصلت مشكلة");
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("مقدرناش ننسخ — اختار النص بإيدك");
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={box}
        className="bg-white rounded-2xl border border-slate-200 p-3 overflow-hidden"
      >
        <PostSvg post={post} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="rounded-xl bg-brand-600 text-white font-bold py-3 hover:bg-brand-700 disabled:opacity-60 transition"
        >
          {busy ? "ثانية..." : "⬇️ نزّل الصورة"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(post.caption)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-emerald-600 text-white font-bold py-3 text-center hover:bg-emerald-700 transition"
        >
          واتساب
        </a>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-bold text-slate-800">الكلام اللي يتكتب مع الصورة</h2>
          <button
            type="button"
            onClick={copyCaption}
            className="text-xs font-bold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition"
          >
            {copied ? "اتنسخ ✓" : "انسخ"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
          {post.caption}
        </pre>
      </section>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        لو الصورة مانزلتش، اعمل سكرين شوت للتصميم من فوق — مقاسه مربّع
        وجاهز للواتساب.
        <br />
        <a href={shareUrl} className="text-brand-700 font-bold hover:underline">
          {shareUrl}
        </a>
      </p>
    </div>
  );
}
