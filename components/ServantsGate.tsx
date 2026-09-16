"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { unlockServants } from "@/app/attendance/servants/gate-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-600 py-3 text-white font-bold text-lg hover:bg-brand-700 disabled:opacity-60 transition"
    >
      {pending ? "بيتأكد..." : "فتح"}
    </button>
  );
}

export default function ServantsGate() {
  const [state, formAction] = useActionState(unlockServants, null);

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-brand-900">سكشن الخدام مقفول</h2>
        <p className="text-slate-500 mt-1 text-sm">
          اكتب الكود السري عشان تدخل
        </p>
      </div>

      <form
        action={formAction}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
      >
        <div>
          <label htmlFor="code" className="block text-sm font-bold mb-1.5 text-slate-700">
            الكود السري
          </label>
          <input
            id="code"
            name="code"
            type="password"
            required
            autoFocus
            autoComplete="off"
            dir="ltr"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {state?.error && (
          <p className="text-red-600 text-sm font-bold bg-red-50 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
