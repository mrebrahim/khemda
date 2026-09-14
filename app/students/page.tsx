import NavBar from "@/components/NavBar";
import StudentDirectory from "@/components/StudentDirectory";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("students")
    .select("id, full_name, phone, father_phone, classes(area, stage)")
    .eq("is_active", true)
    .order("full_name");

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
      <NavBar title="بيانات المخدومين" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4">
        <StudentDirectory students={students} />
      </main>
    </>
  );
}
