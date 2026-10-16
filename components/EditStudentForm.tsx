"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { setStudentActive, updateStudent } from "@/app/students/[id]/edit/actions";
import { AREAS, STAGES } from "@/lib/types";

export type StudentData = {
  id: number;
  full_name: string;
  area: string;
  stage: string;
  phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  birth_date: string | null;
  confession_father: string | null;
  notes: string | null;
  is_active: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-600 py-3.5 text-white font-bold text-lg hover:bg-brand-700 disabled:opacity-60 transition"
    >
      {pending ? "بيتحفظ..." : "احفظ التعديلات"}
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
  defaultValue,
  type = "text",
  ltr,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
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
        defaultValue={defaultValue ?? ""}
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

export default function EditStudentForm({ student }: { student: StudentData }) {
  const [state, formAction] = useActionState(updateStudent, null);
  const [area, setArea] = useState(student.area);
  const [stage, setStage] = useState(student.stage);
  const [activePending, startTransition] = useTransition();
  const [activeError, setActiveError] = useState<string | null>(null);
  const router = useRouter();

  const movedClass = area !== student.area || stage !== student.stage;

  function toggleActive() {
    const next = !student.is_active;
    const question = next
      ? `ترجّع ${student.full_name} للخدمة تاني؟`
      : `تأكيد: ${student.full_name} هيختفي من كشوف الحضور والكروت ومش هيقدر يدخل اللعبة. نقطه وحضوره القديم هيفضلوا محفوظين.`;
    if (!confirm(question)) return;

    setActiveError(null);
    startTransition(async () => {
      const res = await setStudentActive(student.id, next);
      if (res.ok) router.refresh();
      else setActiveError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="id" value={student.id} />

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-bold mb-1.5 text-slate-700"
            >
              اسم المخدوم <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              defaultValue={student.full_name}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

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

          {movedClass && (
            <p className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 text-sm text-amber-900">
              هينتقل من <b>{student.stage} — {student.area}</b> لـ{" "}
              <b>{stage} — {area}</b>. حضوره ونقطه القديمة هيفضلوا زي ما هي،
              بس هيظهر مع خدام الفصل الجديد.
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-700">
            بيانات زيادة{" "}
            <span className="text-slate-400 font-normal text-sm">(اختياري)</span>
          </h2>
          <Field
            name="phone"
            label="تليفون الطفل"
            type="tel"
            ltr
            placeholder="01xxxxxxxxx"
            defaultValue={student.phone}
          />
          <Field
            name="father_phone"
            label="تليفون الأب"
            type="tel"
            ltr
            placeholder="01xxxxxxxxx"
            defaultValue={student.father_phone}
          />
          <Field
            name="mother_phone"
            label="تليفون الأم"
            type="tel"
            ltr
            placeholder="01xxxxxxxxx"
            defaultValue={student.mother_phone}
          />
          <Field
            name="birth_date"
            label="تاريخ الميلاد"
            type="date"
            ltr
            defaultValue={student.birth_date}
          />
          <Field
            name="confession_father"
            label="أب الاعتراف"
            defaultValue={student.confession_father}
          />
          <Field name="address" label="العنوان" defaultValue={student.address} />
          <Field name="notes" label="ملاحظات" defaultValue={student.notes} />
        </section>

        {state?.error && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm font-bold">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      {/* وقف / رجّع المخدوم */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-700">
          {student.is_active ? "المخدوم ساب الخدمة؟" : "المخدوم موقوف دلوقتي"}
        </h2>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          {student.is_active
            ? "لما توقفه هيختفي من كشوف الحضور والكروت ومش هيقدر يدخل اللعبة — من غير ما تمسح أي حاجة من تاريخه."
            : "مش ظاهر في الكشوف ولا بيقدر يدخل اللعبة. تقدر ترجّعه في أي وقت."}
        </p>

        {activeError && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm mt-2">
            {activeError}
          </p>
        )}

        <button
          type="button"
          onClick={toggleActive}
          disabled={activePending}
          className={`mt-3 rounded-xl px-4 py-2.5 font-bold border transition disabled:opacity-60 ${
            student.is_active
              ? "border-red-300 text-red-700 hover:bg-red-50"
              : "border-green-400 text-green-700 hover:bg-green-50"
          }`}
        >
          {activePending
            ? "ثانية..."
            : student.is_active
              ? "وقّف المخدوم"
              : "رجّعه للخدمة"}
        </button>
      </section>
    </div>
  );
}
