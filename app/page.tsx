import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { todayISO, formatArabicDate } from "@/lib/types";
import { servantsGateState } from "@/lib/servants-gate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayISO();
  const servantsLocked = (await servantsGateState()) !== "open";

  const [{ count: studentsCount }, { count: servantsCount }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("servants").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const tiles = [
    {
      href: `/attendance/students?date=${today}`,
      emoji: "🧒",
      title: "حضور المخدومين",
      desc: "القداس • التناول • الخدمة • التسبحة",
      count: studentsCount ?? 0,
      unit: "مخدوم",
    },
    {
      href: `/attendance/servants?date=${today}`,
      emoji: "🙏",
      title: servantsLocked ? "حضور الخدام 🔒" : "حضور الخدام",
      desc: "التحضير • الافتقاد • القداس • التناول • الاجتماعات • الخدمة",
      count: servantsCount ?? 0,
      unit: "خادم",
    },
    {
      href: "/students",
      emoji: "📋",
      title: "بيانات المخدومين",
      desc: "الأسماء والتليفونات والمنطقة والمرحلة",
      count: studentsCount ?? 0,
      unit: "مخدوم",
    },
    {
      href: "/alerts",
      emoji: "⚠️",
      title: "تحذيرات الغياب",
      desc: "مين غاب أو جه مرة واحدة بس الشهر ده",
    },
    {
      href: "/summary",
      emoji: "📊",
      title: "ملخص الشهر — المخدومين",
      desc: "مين جه ومين ما جاش وتحليل بياني",
    },
    {
      href: "/birthdays",
      emoji: "🎂",
      title: "أعياد الميلاد",
      desc: "أعياد ميلاد كل شهر من أكتوبر لسبتمبر",
    },
    {
      href: "/servants-summary",
      emoji: servantsLocked ? "🔒" : "🙌",
      title: "ملخص الشهر — الخدام",
      desc: "مين بيحضر ومين بيفتقد ومين بيجي القداس",
    },
    {
      href: "/visitation",
      emoji: servantsLocked ? "🔒" : "🏠",
      title: "الافتقاد",
      desc: "كل خادم بيفتقد ولا لأ، أسبوع بأسبوع",
    },
    {
      href: "/reports",
      emoji: "📋",
      title: "تقرير الأيام",
      desc: "أرقام الحضور في آخر ١٥ يوم",
    },
  ];

  return (
    <>
      <NavBar title="حضور مدارس الأحد" />
      <main className="max-w-4xl mx-auto px-3 py-5 space-y-4">
        <p className="text-center text-slate-500 text-sm">
          النهاردة {formatArabicDate(today)}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-400 hover:shadow-md transition group"
            >
              <div className="text-3xl mb-2">{t.emoji}</div>
              <h2 className="font-bold text-lg text-brand-900 group-hover:text-brand-700">
                {t.title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
              {t.count !== undefined && (
                <p className="text-xs text-slate-400 mt-2 font-bold">
                  {t.count} {t.unit}
                </p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
