"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import HeroAvatar from "@/components/board/HeroAvatar";
import { PLACE_BADGE, GFX } from "@/lib/assets";
import { tierColor, type Ranked } from "@/lib/board";
import { normalizeArabic } from "@/lib/types";

export default function BoardList({
  rows,
  meId,
}: {
  rows: Ranked[];
  /** لو الولد داخل بكوده، بطاقته بتتميّز ويقدر يقفز عليها */
  meId: number | null;
}) {
  const [q, setQ] = useState("");
  const term = normalizeArabic(q);
  const searching = term.length >= 2;

  const list = useMemo(() => {
    if (!searching) return rows.filter((r) => r.place > 3);
    const words = term.split(" ").filter(Boolean);
    return rows.filter((r) => {
      const name = normalizeArabic(r.display_name);
      return words.every((w) => name.includes(w));
    });
  }, [rows, term, searching]);

  const jumpToMe = () => {
    const el = document.getElementById(`hero-${meId}`) ?? document.getElementById("podium");
    if (!el) return;
    setQ("");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("b-me");
  };

  return (
    <section className="mt-4">
      {/* البحث */}
      <div className="flex gap-2">
        <label className="relative grow">
          <span className="sr-only">ابحث عن اسم بطل</span>
          <span
            className="absolute inset-y-0 left-3 grid place-content-center text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن اسم بطل..."
            enterKeyHint="search"
            autoComplete="off"
            className="b-frame w-full px-4 py-3 pl-10 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
          />
        </label>

        {meId !== null && (
          <button
            type="button"
            onClick={jumpToMe}
            className="b-frame shrink-0 px-4 text-sm font-bold text-amber-300 hover:text-amber-200 transition"
          >
            مركزي
          </button>
        )}
      </div>

      {searching && (
        <p className="text-xs text-slate-400 mt-2 px-1">
          {list.length > 0 ? `${list.length} نتيجة` : "مفيش حد بالاسم ده — جرّب أول اسمك بس."}
        </p>
      )}

      <ol className="space-y-2 mt-3">
        {list.map((s, i) => {
          const color = tierColor(s.rank_tier);
          const top10 = s.place <= 10;
          return (
            <li
              key={s.id}
              id={`hero-${s.id}`}
              className={`b-frame b-row relative px-3 py-3 ${s.isMe ? "b-me" : ""} ${
                i < 14 ? "b-in" : ""
              }`}
              style={{
                ["--edge" as string]: color,
                animationDelay: `${Math.min(i, 14) * 0.035}s`,
                borderColor: top10 ? `${color}66` : undefined,
              }}
            >
              <div className="flex items-center gap-2.5">
                {PLACE_BADGE[s.place] ? (
                  <Image
                    src={PLACE_BADGE[s.place]}
                    alt={`المركز ${s.place}`}
                    width={128}
                    height={128}
                    className="w-10 h-10 shrink-0 object-contain"
                  />
                ) : (
                  <span
                    className="g-rank w-9 h-10 shrink-0 grid place-content-center font-bold tabular-nums text-sm"
                    style={{
                      background: top10 ? `${color}3d` : "rgba(255,255,255,.10)",
                      color: "#ffffff",
                      boxShadow: top10 ? `inset 0 0 0 1px ${color}` : undefined,
                    }}
                  >
                    {s.place}
                  </span>
                )}

                <HeroAvatar seed={s.id} size={40} color={color} />

                <div className="grow min-w-0">
                  <p className="font-bold text-white text-[15px] leading-tight truncate">
                    {s.display_name}
                    {s.isMe && (
                      <span className="mr-1.5 text-[10px] font-bold text-amber-300 align-middle">
                        (إنت)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    <span className="sm:hidden font-bold" dir="ltr" style={{ color }}>
                      LEVEL {String(s.rank_level ?? 1).padStart(2, "0")}
                    </span>
                    <span className="sm:hidden"> • </span>
                    {[s.area, s.stage].filter(Boolean).join(" • ")}
                    {s.rank_name ? ` • ${s.rank_name}` : ""}
                  </p>
                </div>

                <span
                  className="hidden sm:inline-flex items-baseline gap-1 px-2 py-1 shrink-0 font-bold leading-none"
                  dir="ltr"
                  style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
                >
                  <span className="text-[8px] tracking-[0.18em] opacity-80">LEVEL</span>
                  <span className="text-xs tabular-nums">
                    {String(s.rank_level ?? 1).padStart(2, "0")}
                  </span>
                </span>

                <span className="shrink-0 flex items-center gap-1">
                  <Image
                    src={GFX.xpGold}
                    alt=""
                    width={96}
                    height={96}
                    aria-hidden="true"
                    className="w-5 h-5 object-contain hidden sm:block"
                  />
                  <span className="text-left w-12">
                    <span className="block font-bold text-lg text-amber-400 tabular-nums leading-none">
                      {s.verified_xp}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">نقطة</span>
                  </span>
                </span>
              </div>

              {/* تقدّمه للمستوى اللي بعده */}
              {s.toNext !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="b-bar block grow h-1.5 bg-black/50 overflow-hidden">
                    <span style={{ width: `${s.percent}%` }} />
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                    فاضل {s.toNext} لـLEVEL {String(s.nextLevel).padStart(2, "0")}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
