"use client";

import { useRouter } from "next/navigation";

export type StreetOption = { value: string; label: string; href: string };

/** فلتر بالشارع — قايمة بتتنقل أول ما تختار */
export default function StreetFilter({
  options,
  value,
}: {
  options: StreetOption[];
  value: string;
}) {
  const router = useRouter();
  if (options.length <= 1) return null;

  return (
    <label className="block mt-3">
      <span className="block text-[11px] text-slate-500 mb-1">فلتر بالشارع</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) router.push(next.href);
        }}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-brand-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
