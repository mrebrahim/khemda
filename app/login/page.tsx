"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-600 py-3 text-white font-bold text-lg hover:bg-brand-700 disabled:opacity-60 transition"
    >
      {pending ? "جاري الدخول..." : "دخول"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-linear-to-b from-brand-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">✝️</div>
          <h1 className="text-2xl font-bold text-brand-900">حضور مدارس الأحد</h1>
          <p className="text-slate-500 mt-1">متابعة المخدومين والخدام</p>
        </div>

        <form
          action={formAction}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-1.5 text-slate-700">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              dir="ltr"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-1.5 text-slate-700">
              كلمة السر
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
    </main>
  );
}
