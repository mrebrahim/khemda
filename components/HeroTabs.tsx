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
    <nav data-tut="tabs" className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0b0e13]/95 backdrop-blur">
      <ul className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 transition ${
                  active ? "text-amber-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-xl leading-none">{t.emoji}</span>
                <span className="text-[10px] font-bold">{t.label}</span>
                <span
                  className={`h-0.5 w-6 rounded-full ${
                    active ? "bg-amber-400" : "bg-transparent"
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
