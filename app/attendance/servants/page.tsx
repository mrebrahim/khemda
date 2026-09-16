import NavBar from "@/components/NavBar";
import SessionBar from "@/components/SessionBar";
import AttendanceGrid from "@/components/AttendanceGrid";
import ServantsGate from "@/components/ServantsGate";
import NotConfigured from "@/components/NotConfigured";
import { createClient } from "@/lib/supabase/server";
import { SERVANT_FIELDS, todayISO } from "@/lib/types";
import { servantsGateState } from "@/lib/servants-gate";
import { setServantMark } from "../actions";
import { lockServants } from "./gate-actions";

export const dynamic = "force-dynamic";

export default async function ServantsAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const gate = await servantsGateState();

  if (gate !== "open") {
    return (
      <>
        <NavBar title="حضور الخدام" back="/" />
        <main className="max-w-4xl mx-auto px-3 py-4">
          {gate === "not-configured" ? <NotConfigured /> : <ServantsGate />}
        </main>
      </>
    );
  }

  const { date: raw } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? "") ? raw! : todayISO();

  const supabase = await createClient();

  const [servantsRes, sessionRes] = await Promise.all([
    supabase
      .from("servants")
      .select("id, full_name, classes(area, stage)")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("sessions")
      .select("id, is_monthly_mass")
      .eq("session_date", date)
      .maybeSingle(),
  ]);

  const people = (servantsRes.data ?? []).map((s) => {
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
      .from("servant_attendance")
      .select(
        "servant_id, preparation, visitation, mass, communion, servants_meeting, family_meeting, service",
      )
      .eq("session_id", sessionRes.data.id);

    for (const r of rows ?? []) {
      marks[r.servant_id] = {
        preparation: r.preparation,
        visitation: r.visitation,
        mass: r.mass,
        communion: r.communion,
        servants_meeting: r.servants_meeting,
        family_meeting: r.family_meeting,
        service: r.service,
      };
    }
  }

  async function toggle(d: string, id: number, field: string, value: boolean) {
    "use server";
    // القفل بيتراجع هنا كمان، مش في عرض الصفحة بس
    const state = await servantsGateState();
    if (state !== "open") throw new Error("سكشن الخدام مقفول");
    return setServantMark(d, id, field as never, value);
  }

  return (
    <>
      <NavBar title="حضور الخدام" back="/" />
      <main className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        <SessionBar
          date={date}
          isMonthlyMass={sessionRes.data?.is_monthly_mass ?? false}
        />
        <AttendanceGrid
          key={date}
          people={people}
          fields={SERVANT_FIELDS}
          initialMarks={marks}
          date={date}
          onToggle={toggle}
        />
        <form action={lockServants} className="text-center pt-1">
          <button
            type="submit"
            className="text-xs text-slate-500 hover:text-slate-700 rounded-lg px-3 py-2 hover:bg-slate-100 transition"
          >
            🔒 اقفل سكشن الخدام
          </button>
        </form>
      </main>
    </>
  );
}
