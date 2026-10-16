"use client";

import { useState, useTransition } from "react";
import { generateMissingCodes } from "@/app/admin/cards/actions";

export default function MissingCodesCard({
  students,
}: {
  students: { id: number; full_name: string; area: string | null; stage: string | null }[];
}) {
  const [done, setDone] = useState<{ created: number; failed: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  if (students.length === 0 && !done) {
    return (
      <section className="bg-green-50 border border-green-300 rounded-2xl p-4 print:hidden">
        <p className="font-bold text-green-800">
          ✅ كل المخدومين معاهم كود دخول وQR
        </p>
        <p className="text-sm text-green-700 mt-1">
          أي مخدوم جديد هياخد كوده لوحده وقت التسجيل.
        </p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="bg-green-50 border border-green-300 rounded-2xl p-4 print:hidden">
        <p className="font-bold text-green-800">
          ✅ اتعمل {done.created} كود جديد
        </p>
        <p className="text-sm text-green-700 mt-1">
          حدّث الصفحة عشان كروتهم تطلع في الطباعة.
        </p>
        {done.failed.length > 0 && (
          <p className="text-sm text-red-700 mt-2">
            ماقدرناش نعمل كود لـ: {done.failed.join("، ")}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4 print:hidden">
      <h2 className="font-bold text-amber-900">
        ⚠️ فيه {students.length} مخدوم من غير كود ولا QR
      </h2>
      <p className="text-sm text-amber-800 mt-1 leading-relaxed">
        دول اتسجّلوا قبل ما نظام الأكواد يشتغل، فمش هيقدروا يدخلوا اللعبة
        ولا يتعمل لهم كارت.
      </p>

      <ul className="text-sm text-amber-900 mt-2.5 space-y-0.5 max-h-40 overflow-y-auto">
        {students.map((s) => (
          <li key={s.id}>
            • {s.full_name}
            <span className="text-amber-700 text-xs">
              {" "}
              {[s.area, s.stage].filter(Boolean).join(" — ")}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setDone(await generateMissingCodes());
          })
        }
        className="mt-3 bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-amber-700 disabled:opacity-60 transition"
      >
        {pending ? "بنعمل الأكواد..." : `اعمل كود لكل الـ${students.length}`}
      </button>
    </section>
  );
}
