"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createStudent, findSimilar } from "@/app/students/new/actions";
import { AREAS, STAGES } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-600 py-3.5 text-white font-bold text-lg hover:bg-brand-700 disabled:opacity-60 transition"
    >
      {pending ? "بيتحفظ..." : "حفظ المخدوم"}
    </button>
  );
}

function ChoiceGroup({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold mb-2 text-slate-700">
        {label} <span className="text-red-500">*</span>
      </legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`rounded-xl border-2 py-3 font-bold transition ${
              value === o
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  name,
  label,
  type = "text",
  ltr,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  ltr?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold mb-1.5 text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        inputMode={type === "tel" ? "numeric" : undefined}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500 ${
          ltr ? "text-left" : ""
        }`}
      />
    </div>
  );
}

type Similar = { id: number; full_name: string; label: string };

export default function NewStudentForm() {
  const [state, formAction] = useActionState(createStudent, null);
  const [area, setArea] = useState("");
  const [stage, setStage] = useState("");
  const [name, setName] = useState("");
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [, startTransition] = useTransition();

  // تنبيه لو فيه اسم قريب متسجّل قبل كده
  useEffect(() => {
    const q = name.trim();
    if (q.length < 3) {
      setSimilar([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          setSimilar(await findSimilar(q));
        } catch {
          setSimilar([]);
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [name]);

  return (
    <form action={formAction} className="space-y-5">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-bold mb-1.5 text-slate-700">
            اسم المخدوم <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم ثلاثي"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {similar.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 text-sm">
            <p className="font-bold text-amber-900 mb-1">
              فيه اسم شبهه متسجّل قبل كده:
            </p>
            <ul className="space-y-0.5">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/students/${s.id}`}
                    className="text-amber-900 hover:underline"
                  >
                    {s.full_name}
                    {s.label && (
                      <span className="text-amber-700 text-xs"> — {s.label}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-amber-700 text-xs mt-1.5">
              لو ده مخدوم تاني كمّل عادي.
            </p>
          </div>
        )}

        <ChoiceGroup
          name="area"
          label="المنطقة"
          options={AREAS}
          value={area}
          onChange={setArea}
        />

        <ChoiceGroup
          name="stage"
          label="المرحلة"
          options={STAGES}
          value={stage}
          onChange={setStage}
        />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-bold text-slate-700">
          بيانات زيادة <span className="text-slate-400 font-normal text-sm">(اختياري)</span>
        </h2>
        <Field name="phone" label="تليفون الطفل" type="tel" ltr placeholder="01xxxxxxxxx" />
        <Field name="father_phone" label="تليفون الأب" type="tel" ltr placeholder="01xxxxxxxxx" />
        <Field name="mother_phone" label="تليفون الأم" type="tel" ltr placeholder="01xxxxxxxxx" />
        <Field name="birth_date" label="تاريخ الميلاد" type="date" ltr />
        <Field name="confession_father" label="أب الاعتراف" />
        <Field name="address" label="العنوان" />
        <Field name="notes" label="ملاحظات" />
      </section>

      {state?.error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm font-bold">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
