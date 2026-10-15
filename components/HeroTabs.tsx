"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/hero", emoji: "🏠", label: "الرئيسية" },
  { href: "/hero/daily", emoji: "☀️", label: "يومي" },
  { href: "/hero/weekly", emoji: "📅", label: "أسبوعي" },
  { href: "/hero/monthly", emoji: "⭐", label: "شهري" },
  { href: "/hero/rewards", emoji: "🎁", label: "جوايز" },
];

export default function HeroTabs() {
  const path = usePathname();

  return (
    <nav
      data-tut="tabs"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-amber-500/25 bg-[#0b0e13]/95 backdrop-blur"
    >
      <ul className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 transition ${
                  active ? "tab-on text-amber-300" : "text-slate-400 hover:text-white"
                }`}
              >
                <span
                  className={`text-xl leading-none transition-transform ${
                    active ? "scale-110" : ""
                  }`}
                >
                  {t.emoji}
                </span>
                <span className="text-[10px] font-bold">{t.label}</span>
                <span
                  className={`absolute top-0 inset-x-3 h-0.5 ${
                    active ? "bg-amber-400 shadow-[0_0_10px_1px_rgba(242,169,0,.9)]" : ""
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
