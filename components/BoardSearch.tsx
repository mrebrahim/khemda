"use client";

import { useMemo, useState } from "react";
import { normalizeArabic } from "@/lib/types";

export type SearchRow = {
  id: number;
  place: number;
  display_name: string;
  area: string | null;
  stage: string | null;
  verified_xp: number;
  rank_name: string | null;
  rank_tier: string | null;
  rank_level: number | null;
};

const TIER_COLOR: Record<string, string> = {
  bronze: "#d97706",
  silver: "#cbd5e1",
  gold: "#f2a900",
  platinum: "#22d3ee",
  legendary: "#a78bfa",
};

/** الولد يكتب اسمه فيشوف ترتيبه ومستواه على طول */
export default function BoardSearch({
  rows,
  total,
}: {
  rows: SearchRow[];
  total: number;
}) {
  const [q, setQ] = useState("");
  const term = normalizeArabic(q);

  const hits = useMemo(() => {
    if (term.length < 2) return [];
    const words = term.split(" ").filter(Boolean);
    return rows
      .filter((r) => {
        const name = normalizeArabic(r.display_name);
        return words.every((w) => name.includes(w));
      })
      .slice(0, 8);
  }, [rows, term]);

  return (
    <section className="mt-5">
      <label className="block">
        <span className="sr-only">دوّر باسمك</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 اكتب اسمك تشوف ترتيبك ومستواك"
          enterKeyHint="search"
          autoComplete="off"
          className="w-full bg-white/5 border border-white/15 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none transition"
        />
      </label>

      {term.length >= 2 && (
        <div className="mt-3 space-y-2">
          {hits.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-3">
              مفيش حد بالاسم ده — جرّب أول اسمك بس.
            </p>
          ) : (
            hits.map((r) => {
              const color = TIER_COLOR[r.rank_tier ?? "bronze"] ?? "#f2a900";
              return (
                <article
                  key={r.id}
                  className="g-card g-edge g-glow-gold p-3.5"
                  style={{ ["--edge" as string]: color }}
                >
                  <div className="flex items-center gap-3">
                    <span className="g-rank w-10 h-11 shrink-0 grid place-content-center bg-white/10 font-bold text-white tabular-nums text-sm">
                      {r.place}
                    </span>

                    <div className="grow min-w-0">
                      <p className="font-bold text-white text-base leading-tight truncate">
                        {r.display_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[r.area, r.stage].filter(Boolean).join(" • ")}
                      </p>
                    </div>

                    <span className="shrink-0 text-left">
                      <span className="block font-bold text-xl text-amber-400 tabular-nums leading-none">
                        {r.verified_xp}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">نقطة</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10">
                    <span
                      className="inline-flex items-baseline gap-1 px-2 py-1 font-bold leading-none"
                      dir="ltr"
                      style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
                    >
                      <span className="text-[9px] tracking-[0.18em] opacity-80">LEVEL</span>
                      <span className="text-sm tabular-nums">
                        {String(r.rank_level ?? 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="text-xs text-slate-300 truncate">
                      {r.rank_name ?? "—"}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                      ترتيبك {r.place} من {total}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
