"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ActivityRule } from "@/lib/xp";

type Step = {
  /** العنصر اللي السهم بيشاور عليه — لو مش موجود الخطوة تتوسّط الشاشة */
  target?: string;
  emoji: string;
  title: string;
  body: string;
  /** نقط مرتّبة تحت الشرح */
  list?: string[];
};

const KEY = (id: number) => `hero_tut_v1_${id}`;
export const TUTORIAL_EVENT = "hero:tutorial";

/** أكبر عدد نقط ممكن أي ولد يجيبها في جمعة واحدة — مراكز المسابقة مستثناة */
function fridayCeiling(rules: ActivityRule[]): number {
  return rules
    .filter((r) => r.category === "friday" && r.is_active && !/_(1st|2nd|3rd)$/.test(r.code))
    .reduce((n, r) => n + r.xp, 0);
}

function buildSteps(rules: ActivityRule[]): Step[] {
  const xp = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;
  const ceiling = fridayCeiling(rules);

  const tips = [
    `🏫 احضر الخدمة يوم الجمعة — أكبر نقط في الأسبوع (+${xp("sunday_school")})`,
    `⛪ احضر القداس (+${xp("mass")}) وتناول (+${xp("communion")}) وتعالى بدري (+${xp("early")})`,
    `📝 شارك في مسابقة الجمعة والخميس — مجرد إنك تشارك بتاخد نقط`,
    `⭐ القداس الشهري (+${xp("monthly_mass")}) ولو قريت القرايات كمان (+${xp("monthly_readings")})`,
    `🙏 وكل يوم: الصلاة (+${xp("prayer")}) والكتاب المقدس (+${xp("bible")}) — صغيرة بس السلسلة بتخلّيها كبيرة`,
  ];

  return [
    {
      emoji: "👋",
      title: "أهلاً يا بطل!",
      body:
        "دي لوحة الأبطال بتاعتك. خليني أوريك كل حاجة فيها في نص دقيقة، " +
        "وأقولك إزاي تجمع أكبر عدد نقط.",
    },
    {
      target: '[data-tut="xp"]',
      emoji: "⭐",
      title: "النقط",
      body:
        "ده رصيدك. أي حاجة تعملها بتزوّد الرقم ده، والنقط هي اللي بتطلعك LEVEL " +
        "وتفتح لك الجوايز الحقيقية.",
    },
    {
      target: '[data-tut="level"]',
      emoji: "🎖️",
      title: "الـLEVEL",
      body:
        "الشريط ده بيوريك وصلت فين. تحتيه مكتوب فاضلك كام نقطة بالظبط على اللفل " +
        "اللي بعده — كل لفل جديد معاه جايزة.",
    },
    {
      target: '[data-tut="streak"]',
      emoji: "🔥",
      title: "السلسلة",
      body:
        "كل يوم تعمل فيه مهمة، الرقم ده يزيد ١. لو فاتك يوم يرجع من الأول! " +
        "وكل ٣ و٧ و١٤ و٣٠ و٦٠ يوم ورا بعض فيه بونص نقط زيادة.",
    },
    {
      target: '[data-tut="today"]',
      emoji: "☀️",
      title: "مهمات النهارده",
      body:
        "الصلاة وقراية الكتاب المقدس. تدوس على المهمة فتتسجّل وتاخد نقطك على طول " +
        "— دقيقة واحدة بس وسلسلتك تكمّل.",
    },
    {
      target: '[data-tut="prize"]',
      emoji: "🎁",
      title: "جايزتك الجاية",
      body:
        "دي هدية حقيقية بتستلمها بإيدك لما توصل للـLEVEL ده. لما تفتح، " +
        "هيظهر لك زرار «اطلب جايزتك».",
    },
    {
      target: '[data-tut="card"]',
      emoji: "🎫",
      title: "كارت البطل",
      body:
        "فيه الكود والـQR بتاعك. يوم الجمعة الخادم يمسح الكود، فنقط الحضور " +
        "تدخل رصيدك فورًا قدام عينك.",
    },
    {
      target: '[data-tut="board"]',
      emoji: "🏆",
      title: "لوحة الترتيب",
      body:
        "تشوف ترتيبك بين كل الأبطال، وتدوّر باسمك تعرف إنت LEVEL كام.",
    },
    {
      target: '[data-tut="tabs"]',
      emoji: "🧭",
      title: "التابات اللي تحت",
      body: "كل حاجة في مكانها — دوس على أي تاب تشوف اللي فيه.",
      list: [
        "☀️ يومي — مهمات كل يوم والسلسلة",
        "📅 أسبوعي — نقط الجمعة والخميس",
        "⭐ شهري — القداس الشهري والقرايات",
        "🎁 جوايز — سلّم الجوايز كله",
      ],
    },
    {
      emoji: "🚀",
      title: "إزاي تجمع أكبر عدد نقط؟",
      body: `أكبر جمعة ممكنة = ${ceiling} نقطة. ده الترتيب من الأكبر للأصغر:`,
      list: tips,
    },
  ];
}

export default function Tutorial({
  studentId,
  rules,
}: {
  studentId: number;
  rules: ActivityRule[];
}) {
  const steps = useMemo(() => buildSteps(rules), [rules]);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<{ t: number; l: number; w: number; h: number } | null>(null);

  const onHome = path === "/hero";

  // أول مرة الولد يدخل — يفتح لوحده
  useEffect(() => {
    if (!onHome) return;
    let seen = "1";
    try {
      seen = localStorage.getItem(KEY(studentId)) ?? "";
    } catch {
      return; // لو الـstorage مقفول مانفتحش كل مرة
    }
    if (!seen) {
      setI(0);
      setOpen(true);
    }
  }, [onHome, studentId]);

  // زرار «إزاي أشتغل؟» بيبعت الحدث ده
  useEffect(() => {
    const start = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(TUTORIAL_EVENT, start);
    return () => window.removeEventListener(TUTORIAL_EVENT, start);
  }, []);

  const measure = useCallback(() => {
    const sel = steps[i]?.target;
    if (!sel) {
      setBox(null);
      return;
    }
    const el = document.querySelector(sel);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ t: r.top, l: r.left, w: r.width, h: r.height });
  }, [i, steps]);

  // كل خطوة: نزّل العنصر في وسط الشاشة وبعدها قيس مكانه
  useEffect(() => {
    if (!open) return;
    const sel = steps[i]?.target;
    const el = sel ? document.querySelector(sel) : null;
    if (el) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    measure();
    const timers = [60, 200, 420, 700].map((ms) => window.setTimeout(measure, ms));
    return () => timers.forEach(clearTimeout);
  }, [open, i, steps, measure]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  const finish = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(KEY(studentId), "1");
    } catch {
      /* مش مشكلة */
    }
  }, [studentId]);

  const next = useCallback(() => {
    setI((n) => {
      if (n + 1 >= steps.length) {
        finish();
        return n;
      }
      return n + 1;
    });
  }, [steps.length, finish]);

  // كيبورد: سهم/Enter للتالي، Esc للخروج
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "Enter" || e.key === " " || e.key === "ArrowLeft") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowRight") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, finish]);

  if (!open) return null;

  const step = steps[i];
  const last = i === steps.length - 1;
  const PAD = 8;

  // فوق ولا تحت العنصر؟ لو العنصر في النص السفلي نحط الكلام فوقه
  const below = box ? box.t + box.h < window.innerHeight * 0.52 : false;
  const tipStyle: React.CSSProperties = box
    ? below
      ? { top: box.t + box.h + PAD + 14 }
      : { bottom: window.innerHeight - box.t + PAD + 14 }
    : { top: "50%", transform: "translateY(-50%)" };
  const arrowX = box ? Math.min(Math.max(box.l + box.w / 2, 28), window.innerWidth - 28) : 0;

  return (
    <div
      className="fixed inset-0 z-90"
      role="dialog"
      aria-modal="true"
      aria-label="شرح اللوحة"
      onClick={next}
    >
      {/* الضلمة + فتحة على العنصر */}
      {box ? (
        <div
          className="tut-hole absolute border-2 border-amber-400"
          style={{
            top: box.t - PAD,
            left: box.l - PAD,
            width: box.w + PAD * 2,
            height: box.h + PAD * 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/80" />
      )}

      {/* الكلام */}
      <div className="absolute inset-x-0 px-4" style={tipStyle}>
        {box && (
          <span
            className={`absolute w-4 h-4 rotate-45 bg-[#151a22] border-amber-400 ${
              below ? "border-t-2 border-r-2 -top-2" : "border-b-2 border-l-2 -bottom-2"
            }`}
            style={{ left: arrowX - 8 }}
            aria-hidden="true"
          />
        )}

        <div
          className="relative max-w-md mx-auto bg-[#151a22] border-2 border-amber-400 p-4 text-right shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-2xl leading-none">{step.emoji}</p>
          <h2 className="font-bold text-white text-lg mt-1.5">{step.title}</h2>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{step.body}</p>

          {step.list && (
            <ul className="mt-2.5 space-y-1.5">
              {step.list.map((t) => (
                <li
                  key={t}
                  className="text-[13px] text-slate-200 leading-snug border-b border-white/5 pb-1.5 last:border-0"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 mt-4">
            <span className="text-[11px] text-slate-500 tabular-nums" dir="ltr">
              {i + 1} / {steps.length}
            </span>

            <div className="flex items-center gap-2">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setI((n) => Math.max(0, n - 1))}
                  className="text-xs text-slate-400 px-2 py-2 hover:text-white transition"
                >
                  رجوع
                </button>
              )}
              {!last && (
                <button
                  type="button"
                  onClick={finish}
                  className="text-xs text-slate-400 px-2 py-2 hover:text-white transition"
                >
                  تخطّي
                </button>
              )}
              <button
                type="button"
                onClick={last ? finish : next}
                className="bg-amber-500 text-slate-950 font-bold text-sm px-4 py-2 hover:bg-amber-400 transition"
              >
                {last ? "يلا نبدأ 🔥" : "التالي ←"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
