"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { normalizeArabic } from "@/lib/types";

export type Person = {
  id: number;
  full_name: string;
  area: string | null;
  stage: string | null;
};

export type FieldDef = { key: string; label: string };

type Marks = Record<number, Record<string, boolean>>;

export default function AttendanceGrid({
  people,
  fields,
  initialMarks,
  date,
  onToggle,
  profileBase,
}: {
  people: Person[];
  fields: readonly FieldDef[];
  initialMarks: Marks;
  date: string;
  onToggle: (
    date: string,
    personId: number,
    field: string,
    value: boolean,
  ) => Promise<{ ok: true }>;
  profileBase?: string;
}) {
  const [marks, setMarks] = useState<Marks>(initialMarks);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const areas = useMemo(
    () => [...new Set(people.map((p) => p.area).filter(Boolean) as string[])],
    [people],
  );
  const stages = useMemo(
    () => [...new Set(people.map((p) => p.stage).filter(Boolean) as string[])].sort(),
    [people],
  );

  const visible = useMemo(() => {
    const q = normalizeArabic(query);
    return people.filter((p) => {
      if (area && p.area !== area) return false;
      if (stage && p.stage !== stage) return false;
      if (!q) return true;
      return normalizeArabic(p.full_name).includes(q);
    });
  }, [people, query, area, stage]);

  function toggle(personId: number, field: string, next: boolean) {
    const busyKey = `${personId}:${field}`;
    setError(null);
    // تحديث فوري في الواجهة
    setMarks((m) => ({ ...m, [personId]: { ...m[personId], [field]: next } }));
    setBusy((b) => new Set(b).add(busyKey));

    startTransition(async () => {
      try {
        await onToggle(date, personId, field, next);
      } catch {
        // رجّع الحالة القديمة لو الحفظ فشل
        setMarks((m) => ({ ...m, [personId]: { ...m[personId], [field]: !next } }));
        setError("حصلت مشكلة في الحفظ، جرّب تاني");
      } finally {
        setBusy((b) => {
          const n = new Set(b);
          n.delete(busyKey);
          return n;
        });
      }
    });
  }

  const totals = fields.map(
    (f) => visible.filter((p) => marks[p.id]?.[f.key]).length,
  );

  return (
    <div className="space-y-3">
      {/* البحث والفلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 sticky top-0 z-20 shadow-xs">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 ابحث بالاسم..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        />

        {(areas.length > 1 || stages.length > 1) && (
          <div className="flex flex-wrap gap-1.5">
            {areas.length > 1 && (
              <FilterGroup value={area} onChange={setArea} options={areas} allLabel="كل المناطق" />
            )}
            {stages.length > 1 && (
              <FilterGroup value={stage} onChange={setStage} options={stages} allLabel="كل المراحل" />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="font-bold text-slate-700">{visible.length} فرد</span>
          {fields.map((f, i) => (
            <span key={f.key}>
              {f.label}: <b className="text-green-700">{totals[i]}</b>
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="text-right px-3 py-2.5 font-bold min-w-[9rem]">الاسم</th>
              {fields.map((f) => (
                <th key={f.key} className="px-1.5 py-2.5 font-bold text-center whitespace-nowrap">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 even:bg-slate-50/60">
                <td className="px-3 py-2">
                  {profileBase ? (
                    <Link
                      href={`${profileBase}/${p.id}`}
                      className="font-bold text-brand-800 hover:underline"
                    >
                      {p.full_name}
                    </Link>
                  ) : (
                    <span className="font-bold">{p.full_name}</span>
                  )}
                  {(p.area || p.stage) && (
                    <span className="block text-[11px] text-slate-400">
                      {[p.area, p.stage].filter(Boolean).join(" — ")}
                    </span>
                  )}
                </td>
                {fields.map((f) => {
                  const checked = Boolean(marks[p.id]?.[f.key]);
                  return (
                    <td key={f.key} className="px-1.5 py-2 text-center">
                      <input
                        type="checkbox"
                        className="chk"
                        checked={checked}
                        disabled={busy.has(`${p.id}:${f.key}`)}
                        aria-label={`${f.label} — ${p.full_name}`}
                        onChange={(e) => toggle(p.id, f.key, e.target.checked)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="text-center text-slate-400 py-10"
                >
                  مفيش نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup({
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
