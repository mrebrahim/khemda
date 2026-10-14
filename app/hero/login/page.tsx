"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-yellow-400 py-3.5 text-yellow-950 font-bold text-lg hover:bg-yellow-300 disabled:opacity-60 transition"
    >
      {pending ? "بندخّلك..." : "يلا نبدأ 🔥"}
    </button>
  );
}

export default function HeroLogin() {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-linear-to-b from-brand-900 to-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7 text-white">
          <div className="text-6xl mb-3">🛡️</div>
          <h1 className="text-2xl font-bold">أبطال المهمة</h1>
          <p className="text-white/70 mt-1 text-sm">ادخل بالكود اللي خدته من خادمك</p>
        </div>

        <form
          action={formAction}
          className="bg-white rounded-2xl shadow-lg p-6 space-y-4"
        >
          <div>
            <label htmlFor="code" className="block text-sm font-bold mb-1.5 text-slate-700">
              كود البطل
            </label>
            <input
              id="code"
              name="code"
              required
              autoFocus
              autoComplete="username"
              dir="ltr"
              placeholder="ABC123"
              className="w-full rounded-xl border-2 border-slate-300 px-3 py-3 text-center text-xl font-bold tracking-widest uppercase focus:outline-hidden focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-bold mb-1.5 text-slate-700">
              الرقم السري
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              required
              autoComplete="current-password"
              dir="ltr"
              placeholder="••••"
              className="w-full rounded-xl border-2 border-slate-300 px-3 py-3 text-center text-xl font-bold tracking-widest focus:outline-hidden focus:border-brand-500"
            />
          </div>

          {state?.error && (
            <p className="text-red-600 text-sm font-bold bg-red-50 rounded-lg px-3 py-2 text-center">
              {state.error}
            </p>
          )}

          <Submit />
        </form>

        <p className="text-center text-white/50 text-xs mt-4">
          نسيت الكود؟ اسأل خادمك
        </p>
      </div>
    </main>
  );
}
