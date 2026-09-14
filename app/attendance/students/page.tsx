import NavBar from "@/components/NavBar";
import SessionBar from "@/components/SessionBar";
import AttendanceGrid from "@/components/AttendanceGrid";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_FIELDS, todayISO } from "@/lib/types";
import { setStudentMark } from "../actions";

export const dynamic = "force-dynamic";

export default async function StudentsAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: raw } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? "") ? raw! : todayISO();

  const supabase = await createClient();

  const [studentsRes, sessionRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, classes(area, stage)")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("sessions")
      .select("id, is_monthly_mass")
      .eq("session_date", date)
      .maybeSingle(),
  ]);

  const people = (studentsRes.data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      area: cls?.area ?? null,
      stage: cls?.stage ?? null,
    };
  });

  const marks: Record<number, Record<string, boolean>> = {};
  if (sessionRes.data) {
    const { data: rows } = await supabase
      .from("student_attendance")
      .select("student_id, mass, communion, service, tasbeha")
      .eq("session_id", sessionRes.data.id);

    for (const r of rows ?? []) {
      marks[r.student_id] = {
        mass: r.mass,
        communion: r.communion,
        service: r.service,
        tasbeha: r.tasbeha,
      };
    }
  }

  async function toggle(d: string, id: number, field: string, value: boolean) {
    "use server";
    return setStudentMark(d, id, field as never, value);
  }

  return (
    <>
      <NavBar title="حضور المخدومين" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        <SessionBar
          date={date}
          isMonthlyMass={sessionRes.data?.is_monthly_mass ?? false}
        />
        <AttendanceGrid
          key={date}
          people={people}
          fields={STUDENT_FIELDS}
          initialMarks={marks}
          date={date}
          onToggle={toggle}
          profileBase="/students"
        />
      </main>
    </>
  );
}
