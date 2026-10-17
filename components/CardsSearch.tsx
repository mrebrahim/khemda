"use client";

import { useEffect, useState } from "react";
import { normalizeArabic } from "@/lib/types";

/**
 * بحث بالاسم جوه صفحة الكروت.
 * الكروت متبنية على السيرفر (الـQR جواها)، فالبحث بيخفي ويظهر
 * الكروت الموجودة بدل ما يبعتها تاني للمتصفح.
 */
/** هيكل الاسم من غير حروف المد — «كرستيانو» تلاقي «كريستيانو» */
function skeleton(s: string): string {
  return s.replace(/[اوي]/g, "");
}

export default function CardsSearch({ total }: { total: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(total);
  const [loose, setLoose] = useState(false);

  useEffect(() => {
    const term = normalizeArabic(q);
    const words = term.split(" ").filter(Boolean);
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-card-name]"),
    );

    const hits = (fuzzy: boolean) =>
      cards.filter((el) => {
        const name = el.dataset.cardName ?? "";
        if (words.length === 0) return true;
        return fuzzy
          ? words.every((w) => skeleton(name).includes(skeleton(w)))
          : words.every((w) => name.includes(w));
      });

    // الأول بحث بالظبط، ولو مفيش نتيجة نجرّب من غير حروف المد
    let matched = hits(false);
    let usedLoose = false;
    if (matched.length === 0 && words.length > 0) {
      matched = hits(true);
      usedLoose = matched.length > 0;
    }

    const set = new Set(matched);
    for (const el of cards) el.classList.toggle("card-hidden", !set.has(el));
    const visible = matched.length;
    setLoose(usedLoose);

    // الفصل اللي كل كروته متخفية يتخفي هو كمان عشان الطباعة
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-class-page]"),
    );
    let last: HTMLElement | null = null;
    for (const sec of sections) {
      const any = sec.querySelector("[data-card-name]:not(.card-hidden)");
      sec.classList.toggle("card-hidden", !any);
      sec.classList.remove("break-last");
      if (any) last = sec;
    }
    // آخر فصل ظاهر مايطلعش بعده ورقة فاضية
    last?.classList.add("break-last");

    setShown(visible);
  }, [q, total]);

  return (
    <div className="mt-3 print:hidden">
      <label className="relative block">
        <span className="sr-only">ابحث بالاسم</span>
        <span
          className="absolute inset-y-0 right-3 grid place-content-center text-slate-400 pointer-events-none"
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم المخدوم..."
          enterKeyHint="search"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 pr-10 pl-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <p className="text-xs text-slate-500 mt-1.5">
        {q.trim().length === 0 ? (
          <>بتطبع {total} كارت — اكتب اسم عشان تطبع كارت واحد بس</>
        ) : shown === 0 ? (
          <span className="text-red-600 font-bold">
            مفيش حد بالاسم ده — جرّب أول اسمه بس
          </span>
        ) : (
          <>
            {loose && <span className="text-amber-700">أقرب نتيجة: </span>}
            ظاهر <b className="text-slate-700">{shown}</b> كارت — اللي ظاهر بس
            هو اللي هيتطبع
          </>
        )}
      </p>
    </div>
  );
}
