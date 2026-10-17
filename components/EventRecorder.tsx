"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { markClass, setBonus, setPlace, toggleEventMark } from "@/app/events/actions";
import { PLACE_LABEL, PLACE_MEDAL } from "@/lib/events";
import { normalizeArabic } from "@/lib/types";

export type RecordStudent = {
  id: number;
  full_name: string;
  class_key: string;
  stage: string;
  area: string;
};

export type ClassGroup = {
  key: string;
  stage: string;
  area: string;
  servants: string[];
  students: RecordStudent[];
};

export type MarkState = { present: boolean; place: number | null; bonus: boolean };

type Toast = { id: number; text: string; tone: "good" | "bad" };

/** بحث بالعربي: بيشيل التشكيل، ولو مفيش نتيجة بيجرّب من غير حروف العلة */
function skeleton(input: string): string {
  return normalizeArabic(input).replace(/[اوي]/g, "");
}

export default function EventRecorder({
  eventKey,
  date,
  label,
  emoji,
  entryXp,
  placeXp,
  bonusXp,
  bonusLabel,
  groups,
  initial,
  readOnly,
}: {
  eventKey: string;
  date: string;
  label: string;
  emoji: string;
  entryXp: number;
  placeXp: readonly [number, number, number] | null;
  bonusXp: number | null;
  bonusLabel: string | null;
  groups: ClassGroup[];
  initial: Record<number, MarkState>;
  readOnly: boolean;
}) {
  const [marks, setMarks] = useState<Record<number, MarkState>>(initial);
  // لما السيرفر يرجّع بيانات جديدة (مسح كود مثلاً) الكشف يتحدّث
  useEffect(() => setMarks(initial), [initial]);
  const [query, setQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  const allStudents = useMemo(() => groups.flatMap((g) => g.students), [groups]);

  const present = useMemo(
    () => allStudents.filter((s) => marks[s.id]?.present).length,
    [allStudents, marks],
  );

  const totalXp = useMemo(() => {
    let sum = 0;
    for (const s of allStudents) {
      const m = marks[s.id];
      if (!m?.present) continue;
      sum += entryXp;
      if (m.place && placeXp) sum += placeXp[m.place - 1];
      if (m.bonus && bonusXp) sum += bonusXp;
    }
    return sum;
  }, [allStudents, marks, entryXp, placeXp, bonusXp]);

  const podium = useMemo(() => {
    const byPlace: (RecordStudent | null)[] = [null, null, null];
    for (const s of allStudents) {
      const p = marks[s.id]?.place;
      if (p) byPlace[p - 1] = s;
    }
    return byPlace;
  }, [allStudents, marks]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return groups;
    const qs = skeleton(query);
    const hit = (s: RecordStudent) => {
      const n = normalizeArabic(s.full_name);
      return n.includes(q) || (qs.length >= 3 && skeleton(s.full_name).includes(qs));
    };
    return groups
      .map((g) => ({ ...g, students: g.students.filter(hit) }))
      .filter((g) => g.students.length > 0);
  }, [groups, query]);

  function say(text: string, tone: Toast["tone"] = "good") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  function lock(id: number, on: boolean) {
    setBusy((b) => {
      const next = new Set(b);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggle(s: RecordStudent) {
    if (readOnly) return;
    const was = marks[s.id] ?? { present: false, place: null, bonus: false };
    const next: MarkState = {
      present: !was.present,
      place: was.present ? null : was.place,
      bonus: was.present ? false : was.bonus,
    };
    setMarks((m) => ({ ...m, [s.id]: next }));
    lock(s.id, true);

    startTransition(async () => {
      const res = await toggleEventMark(eventKey, date, s.id, next.present);
      lock(s.id, false);
      if (!res.ok) {
        setMarks((m) => ({ ...m, [s.id]: was }));
        say(res.error, "bad");
        return;
      }
      if (next.present) {
        say(res.xp > 0 ? `+${res.xp} نقطة لـ${first(s.full_name)} 🎉` : `${first(s.full_name)} مسجّل خلاص`);
      } else {
        say(`شيلنا تسجيل ${first(s.full_name)}`, "bad");
      }
    });
  }

  function choosePlace(s: RecordStudent, place: number) {
    if (readOnly) return;
    const was = marks[s.id] ?? { present: false, place: null, bonus: false };
    const same = was.place === place;
    const value = same ? null : place;

    // المركز واحد بس: بنشيله من اللي كان واخده
    setMarks((m) => {
      const next = { ...m };
      if (value !== null) {
        for (const [key, st] of Object.entries(next)) {
          if (st.place === value) next[Number(key)] = { ...st, place: null };
        }
      }
      next[s.id] = { ...was, present: true, place: value };
      return next;
    });
    lock(s.id, true);

    startTransition(async () => {
      const res = await setPlace(eventKey, date, s.id, value);
      lock(s.id, false);
      if (!res.ok) {
        setMarks((m) => ({ ...m, [s.id]: was }));
        say(res.error, "bad");
        return;
      }
      say(
        value === null
          ? `شيلنا مركز ${first(s.full_name)}`
          : `${PLACE_MEDAL[value - 1]} ${first(s.full_name)} ${PLACE_LABEL[value - 1]}${res.xp > 0 ? ` +${res.xp}` : ""}`,
        value === null ? "bad" : "good",
      );
    });
  }

  function toggleBonus(s: RecordStudent) {
    if (readOnly || bonusXp === null) return;
    const was = marks[s.id] ?? { present: false, place: null, bonus: false };
    const value = !was.bonus;
    setMarks((m) => ({ ...m, [s.id]: { ...was, present: true, bonus: value } }));
    lock(s.id, true);

    startTransition(async () => {
      const res = await setBonus(eventKey, date, s.id, value);
      lock(s.id, false);
      if (!res.ok) {
        setMarks((m) => ({ ...m, [s.id]: was }));
        say(res.error, "bad");
        return;
      }
      say(
        value
          ? `⭐ ${first(s.full_name)} ${bonusLabel ?? "بونص"}${res.xp > 0 ? ` +${res.xp}` : ""}`
          : `شيلنا بونص ${first(s.full_name)}`,
        value ? "good" : "bad",
      );
    });
  }

  function markWholeClass(g: ClassGroup) {
    if (readOnly) return;
    const missing = g.students.filter((s) => !marks[s.id]?.present);
    if (missing.length === 0) return;

    setMarks((m) => {
      const next = { ...m };
      for (const s of missing) next[s.id] = { present: true, place: null, bonus: false };
      return next;
    });
    for (const s of missing) lock(s.id, true);

    startTransition(async () => {
      const res = await markClass(
        eventKey,
        date,
        missing.map((s) => s.id),
      );
      for (const s of missing) lock(s.id, false);
      if (!res.ok) {
        setMarks((m) => {
          const next = { ...m };
          for (const s of missing) next[s.id] = { present: false, place: null, bonus: false };
          return next;
        });
        say(res.error, "bad");
        return;
      }
      say(`سجّلنا ${missing.length} ولد من ${g.stage} ${g.area} — +${res.xp} نقطة 🔥`);
    });
  }

  return (
    <div className="space-y-3">
      {/* الشريط الثابت: العدّاد والبحث */}
      <div className="sticky top-[52px] z-20 -mx-3 px-3 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="grow">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${allStudents.length ? (present / allStudents.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1 font-bold">
              سجّلت <span className="tabular-nums">{present}</span> من{" "}
              <span className="tabular-nums">{allStudents.length}</span> — نزّلنا لهم{" "}
              <span className="tabular-nums text-emerald-700">{totalXp}</span> نقطة
            </p>
          </div>
          <span className="text-2xl shrink-0" aria-hidden="true">
            {emoji}
          </span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دوّر باسم الولد…"
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {placeXp && (
        <section className="bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200 p-3">
          <h2 className="font-bold text-amber-900 text-sm">
            منصة {label} — دوس على 🥇🥈🥉 جنب اسم الولد
          </h2>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            {[1, 0, 2].map((i) => (
              <div
                key={i}
                className={`rounded-xl border p-2 ${
                  i === 0
                    ? "bg-amber-100 border-amber-300"
                    : "bg-white border-slate-200"
                }`}
              >
                <p className="text-xl" aria-hidden="true">
                  {PLACE_MEDAL[i]}
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5 truncate">
                  {podium[i] ? first(podium[i]!.full_name) : "فاضي"}
                </p>
                <p className="text-[10px] text-amber-700 font-bold">+{placeXp[i]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 py-8">مفيش ولد بالاسم ده.</p>
      )}

      {filtered.map((g) => {
        const done = g.students.filter((s) => marks[s.id]?.present).length;
        const all = done === g.students.length;
        return (
          <section
            key={g.key}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            <header className="px-3 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800">
                  {g.stage} — {g.area}
                </h3>
                <span
                  className={`text-xs font-bold tabular-nums shrink-0 ${
                    all ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {all ? "الفصل كله حضر 👏" : `${done} / ${g.students.length}`}
                </span>
              </div>
              {g.servants.length > 0 && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  الخدام: {g.servants.join(" • ")}
                </p>
              )}
              {!readOnly && !all && !query && (
                <button
                  type="button"
                  onClick={() => markWholeClass(g)}
                  className="mt-2 w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  ⚡ الفصل كله حضر — سجّل {g.students.length - done} مرة واحدة
                </button>
              )}
            </header>

            <ul className="px-3">
              {g.students.map((s) => {
                const m = marks[s.id] ?? { present: false, place: null };
                const loading = busy.has(s.id);
                return (
                  <li
                    key={s.id}
                    className={`border-b border-slate-100 last:border-0 py-2 ${
                      loading ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(s)}
                        disabled={readOnly}
                        aria-pressed={m.present}
                        className={`grow flex items-center gap-3 rounded-xl px-2 py-2 text-right transition ${
                          m.present
                            ? "bg-emerald-50 border border-emerald-200"
                            : "border border-transparent hover:bg-slate-50"
                        } ${readOnly ? "cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`shrink-0 w-10 h-10 rounded-xl border-2 grid place-content-center text-lg transition ${
                            m.present
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-300 text-slate-300"
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span className="grow min-w-0">
                          <span className="block font-bold text-slate-800 truncate">
                            {s.full_name}
                          </span>
                          <span
                            className={`block text-[11px] font-bold ${
                              m.present ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {m.present
                              ? `حضر ✦ +${entryXp}${
                                  m.place && placeXp
                                    ? ` و${PLACE_MEDAL[m.place - 1]} +${placeXp[m.place - 1]}`
                                    : ""
                                }${m.bonus && bonusXp ? ` و⭐ +${bonusXp}` : ""}`
                              : `دوس عشان تسجّله — +${entryXp}`}
                          </span>
                        </span>
                      </button>

                    </div>

                    {/* الميداليات والبونص في سطر لوحدهم عشان الاسم ياخد عرضه كامل */}
                    {(placeXp || bonusXp !== null) && (
                      <div className="flex gap-1 mt-1.5 pr-[52px]">
                        {placeXp &&
                          [0, 1, 2].map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => choosePlace(s, i + 1)}
                              disabled={readOnly}
                              aria-label={`${PLACE_LABEL[i]} لـ${s.full_name}`}
                              aria-pressed={m.place === i + 1}
                              className={`w-10 h-9 rounded-lg border text-base grid place-content-center transition ${
                                m.place === i + 1
                                  ? "bg-amber-400 border-amber-500"
                                  : "bg-white border-slate-200 opacity-45 hover:opacity-100"
                              }`}
                            >
                              {PLACE_MEDAL[i]}
                            </button>
                          ))}

                        {bonusXp !== null && (
                          <button
                            type="button"
                            onClick={() => toggleBonus(s)}
                            disabled={readOnly}
                            aria-label={`${bonusLabel ?? "بونص"} لـ${s.full_name}`}
                            aria-pressed={m.bonus}
                            className={`h-9 px-2.5 rounded-lg border text-xs font-bold grid place-content-center transition ${
                              m.bonus
                                ? "bg-violet-600 border-violet-700 text-white"
                                : "bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                            }`}
                          >
                            ⭐ {bonusLabel ?? "بونص"}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* رسايل التأكيد */}
      <div className="fixed bottom-3 inset-x-3 z-40 flex flex-col gap-1.5 pointer-events-none items-center">
        {toasts.map((t) => (
          <p
            key={t.id}
            className={`max-w-sm w-full text-center rounded-xl px-3 py-2 text-sm font-bold text-white shadow-lg ${
              t.tone === "good" ? "bg-emerald-600" : "bg-slate-800"
            }`}
          >
            {t.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function first(name: string): string {
  return name.split(" ")[0];
}
