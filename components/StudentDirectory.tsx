"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizeArabic } from "@/lib/types";

type Row = {
  id: number;
  full_name: string;
  phone: string | null;
  father_phone: string | null;
  area: string | null;
  stage: string | null;
};

export default function StudentDirectory({ students }: { students: Row[] }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [stage, setStage] = useState("");

  const areas = useMemo(
    () => [...new Set(students.map((s) => s.area).filter(Boolean) as string[])],
    [students],
  );
  const stages = useMemo(
    () => [...new Set(students.map((s) => s.stage).filter(Boolean) as string[])].sort(),
    [students],
  );

  const visible = useMemo(() => {
    const q = normalizeArabic(query);
    return students.filter((s) => {
      if (area && s.area !== area) return false;
      if (stage && s.stage !== stage) return false;
      if (!q) return true;
      return (
        normalizeArabic(s.full_name).includes(q) ||
        (s.phone ?? "").includes(query.trim()) ||
        (s.father_phone ?? "").includes(query.trim())
      );
    });
  }, [students, query, area, stage]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 ابحث بالاسم أو رقم التليفون..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex flex-wrap gap-1.5">
          <Chips value={area} onChange={setArea} options={areas} allLabel="كل المناطق" />
          <Chips value={stage} onChange={setStage} options={stages} allLabel="كل المراحل" />
        </div>
        <p className="text-xs font-bold text-slate-500">{visible.length} مخدوم</p>
      </div>

      <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {visible.map((s) => (
          <li key={s.id}>
            <Link
              href={`/students/${s.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition"
            >
              <div className="grow min-w-0">
                <p className="font-bold text-brand-900 truncate">{s.full_name}</p>
                <p className="text-xs text-slate-400">
                  {[s.area, s.stage].filter(Boolean).join(" — ")}
                </p>
              </div>
              <span className="text-slate-300 text-lg shrink-0">‹</span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-center text-slate-400 py-10">مفيش نتائج</li>
        )}
      </ul>
    </div>
  );
}

function Chips({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {[{ v: "", l: allLabel }, ...options.map((o) => ({ v: o, l: o }))].map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
            value === o.v
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
