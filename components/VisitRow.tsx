"use client";

import { useState, useTransition } from "react";
import { toggleVisit } from "@/app/visits/actions";
import { mapsLink, telLink, visitMessage, waLink } from "@/lib/visits";

export type VisitStudent = {
  id: number;
  full_name: string;
  address: string | null;
  phone: string | null;
  father_phone: string | null;
  area: string | null;
  /** افتقدته الأسبوع ده؟ */
  visitedThisWeek: boolean;
  /** آخر افتقاد (تاريخ أول الأسبوع) أو null لو عمره ما اتفتقد */
  lastVisit: string | null;
  weeksAgo: number | null;
};

function Since({ weeksAgo }: { weeksAgo: number | null }) {
  if (weeksAgo === null) {
    return (
      <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
        عمره ما اتفتقد
      </span>
    );
  }
  if (weeksAgo === 0) {
    return (
      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
        اتفتقد الأسبوع ده
      </span>
    );
  }
  const label =
    weeksAgo === 1 ? "من أسبوع" : weeksAgo === 2 ? "من أسبوعين" : `من ${weeksAgo} أسابيع`;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
        weeksAgo >= 4
          ? "text-red-700 bg-red-50 border-red-200"
          : "text-amber-700 bg-amber-50 border-amber-200"
      }`}
    >
      آخر افتقاد {label}
    </span>
  );
}

export default function VisitRow({ student }: { student: VisitStudent }) {
  const [checked, setChecked] = useState(student.visitedThisWeek);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const phone = student.phone ?? student.father_phone;
  const firstName = student.full_name.split(" ")[0];
  const wa = waLink(phone, visitMessage(firstName));
  const tel = telLink(phone);
  const map = mapsLink(student.address, student.area);

  function toggle() {
    const next = !checked;
    setChecked(next); // رد فعل فوري
    setError(null);
    startTransition(async () => {
      const res = await toggleVisit(student.id, next);
      if (!res.ok) {
        setChecked(!next);
        setError(res.error);
      }
    });
  }

  return (
    <li
      className={`border-b border-slate-100 last:border-0 py-3 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={checked}
          aria-label={checked ? "شيل علامة الافتقاد" : "علّم إنك افتقدته"}
          className={`shrink-0 w-11 h-11 rounded-xl border-2 grid place-content-center text-xl transition ${
            checked
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "bg-white border-slate-300 text-slate-300 hover:border-emerald-400"
          }`}
        >
          ✓
        </button>

        <div className="grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800">{student.full_name}</p>
            <Since weeksAgo={checked ? 0 : student.weeksAgo} />
          </div>

          {student.address ? (
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              📍 {student.address}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-1">
              📍 العنوان مش مسجّل —{" "}
              <a
                href={`/students/${student.id}/edit`}
                className="text-brand-700 font-bold hover:underline"
              >
                ضيفه
              </a>
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {map && (
              <a
                href={map}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                📍 جوجل مابس
              </a>
            )}
            {tel && (
              <a
                href={tel}
                className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition"
              >
                📞 اتصال
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                💬 واتساب
              </a>
            )}
            {!phone && (
              <span className="text-xs text-slate-400 px-1 py-2">
                مفيش رقم تليفون
              </span>
            )}
          </div>

          {error && <p className="text-xs text-red-700 mt-1.5">{error}</p>}
        </div>
      </div>
    </li>
  );
}
