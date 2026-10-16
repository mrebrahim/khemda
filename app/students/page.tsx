import Link from "next/link";
import NavBar from "@/components/NavBar";
import StudentDirectory from "@/components/StudentDirectory";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ paused?: string }>;
}) {
  const { paused } = await searchParams;
  const showPaused = paused === "1";

  const supabase = await createClient();

  const [{ data }, { count: pausedCount }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, phone, father_phone, classes(area, stage)")
      .eq("is_active", !showPaused)
      .order("full_name"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false),
  ]);

  const students = (data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      phone: s.phone,
      father_phone: s.father_phone,
      area: cls?.area ?? null,
      stage: cls?.stage ?? null,
    };
  });

  return (
    <>
      <NavBar
        title={showPaused ? "المخدومين الموقوفين" : "بيانات المخدومين"}
        back={showPaused ? "/students" : "/"}
      />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        {showPaused ? (
          <p className="bg-slate-100 border border-slate-300 text-slate-700 rounded-2xl px-4 py-3 text-sm">
            دول مش ظاهرين في كشوف الحضور ولا بيقدروا يدخلوا اللعبة. افتح أي
            واحد و«عدّل البيانات» عشان ترجّعه.
          </p>
        ) : (
          <Link
            href="/students/new"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-white py-3.5 font-bold text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition"
          >
            ➕ إضافة مخدوم جديد
          </Link>
        )}

        <StudentDirectory students={students} />

        {!showPaused && (pausedCount ?? 0) > 0 && (
          <p className="text-center text-sm text-slate-500 pt-2">
            <Link href="/students?paused=1" className="font-bold hover:underline">
              ⏸️ شوف {pausedCount} مخدوم موقوف
            </Link>
          </p>
        )}
      </main>
    </>
  );
}
