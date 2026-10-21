"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/hero/actions";

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

export default function HeroLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <main className="g-bg min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7 text-white">
          <div className="text-6xl mb-3">🛡️</div>
          <h1 className="g-title text-3xl font-bold">أبطال المهمة</h1>
          <p className="text-slate-400 mt-2 text-sm">ادخل بالكود اللي خدته من خادمك</p>
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

          {state?.error && (
            <p className="text-red-600 text-sm font-bold bg-red-50 rounded-lg px-3 py-2 text-center">
              {state.error}
            </p>
          )}

          {next ? <input type="hidden" name="next" value={next} /> : null}

          <Submit />
        </form>

        <p className="text-center text-slate-500 text-xs mt-4">
          الكود مكتوب على كارت البطل بتاعك
        </p>
      </div>
    </main>
  );
}
