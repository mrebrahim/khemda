"use client";

import { useMemo, useState, useTransition } from "react";
import { saveContact, toggleVisit } from "@/app/visits/actions";
import {
  isEgyptMobile,
  mapsLink,
  phonesOf,
  telLink,
  visitMessage,
  waLink,
} from "@/lib/visits";
import { parseAddress } from "@/lib/address";

export type VisitStudent = {
  id: number;
  full_name: string;
  address: string | null;
  area: string | null;
  stage?: string | null;
  /** أرقام الولد وأهله زي ما هي متسجّلة */
  phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  /** رقم البيت من تحليل العنوان — الصفحة بترتّب بيه قبل العرض */
  house?: number | null;
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        placeholder={placeholder}
        dir={dir}
        inputMode={dir === "ltr" ? "tel" : "text"}
        className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}

export default function VisitRow({
  student,
  showClass = false,
}: {
  student: VisitStudent;
  /** يوريك المرحلة والمنطقة — في الافتقاد المجمع */
  showClass?: boolean;
}) {
  const [checked, setChecked] = useState(student.visitedThisWeek);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // البيانات المتسجّلة — بتتغيّر هنا على طول، فجوجل ماپس وأزرار
  // الاتصال والواتساب بيتحدّثوا لوحدهم من غير ريفريش
  const [saved, setSaved] = useState({
    address: student.address ?? "",
    phone: student.phone ?? "",
    father_phone: student.father_phone ?? "",
    mother_phone: student.mother_phone ?? "",
  });
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const parsed = useMemo(() => parseAddress(saved.address), [saved.address]);
  const phones = useMemo(
    () =>
      phonesOf({
        phone: saved.phone,
        father_phone: saved.father_phone,
        mother_phone: saved.mother_phone,
      }),
    [saved.phone, saved.father_phone, saved.mother_phone],
  );

  const firstName = student.full_name.split(" ")[0];
  // الواتساب بيروح لأول رقم سليم — مش لأول رقم مكتوب
  const firstGood = phones.find((p) => isEgyptMobile(p.number));
  const wa = waLink(firstGood?.number ?? null, visitMessage(firstName));
  const map = mapsLink(saved.address || null, student.area);

  function openEditor() {
    setDraft(saved);
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveContact(student.id, draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved({
        address: res.address,
        phone: res.phone,
        father_phone: res.father_phone,
        mother_phone: res.mother_phone,
      });
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    });
  }

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
          <div className="flex items-start gap-2">
            <div className="grow min-w-0 flex items-center gap-2 flex-wrap">
              {parsed.house !== null && (
                <span className="shrink-0 bg-slate-900 text-white text-[11px] font-bold rounded-lg px-2 py-0.5 tabular-nums">
                  بيت {parsed.house}
                </span>
              )}
              <p className="font-bold text-slate-800">{student.full_name}</p>
              <Since weeksAgo={checked ? 0 : student.weeksAgo} />
            </div>

            {/* القلم: العنوان والتليفونات كلها من هنا */}
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEditor())}
              aria-expanded={editing}
              aria-label="عدّل العنوان والتليفونات"
              title="عدّل العنوان والتليفونات"
              className={`shrink-0 w-9 h-9 rounded-lg border grid place-content-center text-base transition ${
                editing
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-700"
              }`}
            >
              ✏️
            </button>
          </div>

          {/* العنوان نفسه معروض تحت، فالسطر ده للمرحلة والدور بس */}
          {(showClass || parsed.floor !== null) && (
            <p className="text-[11px] text-slate-500 mt-1">
              {showClass && student.stage && (
                <span className="font-bold text-slate-600">
                  {student.stage} {student.area}
                </span>
              )}
              {showClass && student.stage && parsed.floor !== null ? " • " : ""}
              {parsed.floor !== null ? `الدور ${parsed.floor}` : ""}
            </p>
          )}

          {editing ? (
            <div className="mt-2 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <Field
                label="العنوان"
                value={draft.address}
                onChange={(v) => setDraft({ ...draft, address: v })}
                placeholder="زي: ١٨٢ ش الطابونة د٢"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Field
                  label="رقم الولد"
                  value={draft.phone}
                  onChange={(v) => setDraft({ ...draft, phone: v })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                <Field
                  label="رقم بابا"
                  value={draft.father_phone}
                  onChange={(v) => setDraft({ ...draft, father_phone: v })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                <Field
                  label="رقم ماما"
                  value={draft.mother_phone}
                  onChange={(v) => setDraft({ ...draft, mother_phone: v })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                اكتب الرقم بأي شكل — السيستم بيظبّطه. ولو فيه أكتر من رقم
                سيبهم بمسافة بينهم.
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="rounded-lg bg-brand-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-50"
                >
                  احفظ
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-300 text-slate-500 text-xs font-bold px-4 py-2"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : saved.address ? (
            <p className="text-sm text-slate-600 mt-1">
              📍 {saved.address}
              {justSaved && (
                <span className="text-[11px] text-emerald-600 font-bold"> اتحفظ ✓</span>
              )}
            </p>
          ) : (
            <button
              type="button"
              onClick={openEditor}
              className="block text-right text-sm text-amber-700 font-bold mt-1"
            >
              📍 العنوان مش مسجّل — اكتبه
            </button>
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

            {phones.map((p) => {
              const tel = telLink(p.number);
              // رقم ناقص مش هيرنّ — بنوريه عشان الخادم يصلّحه بالقلم
              if (!tel || !isEgyptMobile(p.number)) {
                return (
                  <button
                    key={p.number}
                    type="button"
                    onClick={openEditor}
                    className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg"
                    title="الرقم ناقص — دوس عشان تصلّحه"
                  >
                    ⚠️ {p.label} ناقص
                  </button>
                );
              }
              return (
                <a
                  key={p.number}
                  href={tel}
                  className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition"
                >
                  📞 {p.label}
                </a>
              );
            })}

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

            {phones.length === 0 && (
              <button
                type="button"
                onClick={openEditor}
                className="text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 px-3 py-2 rounded-lg"
              >
                ⚠️ مفيش رقم — ضيفه
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-700 mt-1.5">{error}</p>}
        </div>
      </div>
    </li>
  );
}
