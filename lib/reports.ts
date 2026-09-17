import "server-only";
import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/month";
import { STAGES, AREAS } from "@/lib/types";

export type SessionRow = {
  id: number;
  session_date: string;
  is_monthly_mass: boolean;
};

/** ترتيب المرحلة: ١ع الأول وبعدين ٢ع وبعدين ٣ع */
export function stageRank(stage: string | null): number {
  const i = (STAGES as readonly string[]).indexOf(stage ?? "");
  return i === -1 ? 99 : i;
}

/** ترتيب المنطقة: رستم أ، رستم ب، الأمل */
export function areaRank(area: string | null): number {
  const i = (AREAS as readonly string[]).indexOf(area ?? "");
  return i === -1 ? 99 : i;
}

export async function getMonthSessions(ym: string): Promise<SessionRow[]> {
  const { start, endExclusive } = monthRange(ym);
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, is_monthly_mass")
    .gte("session_date", start)
    .lt("session_date", endExclusive)
    .order("session_date");
  return (data ?? []) as SessionRow[];
}

/** خادم/خدام كل فصل — عشان نعرف نبعت لمين */
export async function getClassServants(): Promise<Map<number, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("servants")
    .select("full_name, class_id")
    .eq("is_active", true)
    .order("full_name");

  const map = new Map<number, string[]>();
  for (const s of data ?? []) {
    if (s.class_id == null) continue;
    const list = map.get(s.class_id) ?? [];
    list.push(s.full_name);
    map.set(s.class_id, list);
  }
  return map;
}

export type StudentMonth = {
  id: number;
  full_name: string;
  class_id: number;
  area: string | null;
  stage: string | null;
  phone: string | null;
  father_phone: string | null;
  servants: string[];
  mass: number;
  communion: number;
  service: number;
  tasbeha: number;
  /** حضر أي حاجة خالص الشهر ده؟ */
  anyAttendance: number;
};

export async function getStudentsMonth(ym: string): Promise<{
  sessions: SessionRow[];
  students: StudentMonth[];
}> {
  const sessions = await getMonthSessions(ym);
  const supabase = await createClient();
  const servantsByClass = await getClassServants();

  const { data: studentRows } = await supabase
    .from("students")
    .select("id, full_name, class_id, phone, father_phone, classes(area, stage)")
    .eq("is_active", true)
    .order("full_name");

  const counts = new Map<
    number,
    { mass: number; communion: number; service: number; tasbeha: number; any: number }
  >();

  if (sessions.length > 0) {
    const { data: att } = await supabase
      .from("student_attendance")
      .select("student_id, mass, communion, service, tasbeha")
      .in("session_id", sessions.map((s) => s.id));

    for (const r of att ?? []) {
      const c = counts.get(r.student_id) ?? {
        mass: 0, communion: 0, service: 0, tasbeha: 0, any: 0,
      };
      if (r.mass) c.mass++;
      if (r.communion) c.communion++;
      if (r.service) c.service++;
      if (r.tasbeha) c.tasbeha++;
      if (r.mass || r.communion || r.service || r.tasbeha) c.any++;
      counts.set(r.student_id, c);
    }
  }

  const students: StudentMonth[] = (studentRows ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    const c = counts.get(s.id);
    return {
      id: s.id,
      full_name: s.full_name,
      class_id: s.class_id,
      area: cls?.area ?? null,
      stage: cls?.stage ?? null,
      phone: s.phone,
      father_phone: s.father_phone,
      servants: servantsByClass.get(s.class_id) ?? [],
      mass: c?.mass ?? 0,
      communion: c?.communion ?? 0,
      service: c?.service ?? 0,
      tasbeha: c?.tasbeha ?? 0,
      anyAttendance: c?.any ?? 0,
    };
  });

  // ١ع الأول، وجوه كل مرحلة بالمنطقة
  students.sort(
    (a, b) =>
      stageRank(a.stage) - stageRank(b.stage) ||
      areaRank(a.area) - areaRank(b.area) ||
      a.full_name.localeCompare(b.full_name, "ar"),
  );

  return { sessions, students };
}

export type ServantMonth = {
  id: number;
  full_name: string;
  area: string | null;
  stage: string | null;
  preparation: number;
  visitation: number;
  mass: number;
  communion: number;
  servants_meeting: number;
  family_meeting: number;
  service: number;
  /** الجلسات اللي عملوا فيها افتقاد، بالتاريخ */
  visitationDates: Set<number>;
};

export async function getServantsMonth(ym: string): Promise<{
  sessions: SessionRow[];
  servants: ServantMonth[];
}> {
  const sessions = await getMonthSessions(ym);
  const supabase = await createClient();

  const { data: servantRows } = await supabase
    .from("servants")
    .select("id, full_name, classes(area, stage)")
    .eq("is_active", true)
    .order("full_name");

  const counts = new Map<number, Omit<ServantMonth, "id" | "full_name" | "area" | "stage">>();

  if (sessions.length > 0) {
    const { data: att } = await supabase
      .from("servant_attendance")
      .select(
        "servant_id, session_id, preparation, visitation, mass, communion, servants_meeting, family_meeting, service",
      )
      .in("session_id", sessions.map((s) => s.id));

    for (const r of att ?? []) {
      const c = counts.get(r.servant_id) ?? {
        preparation: 0, visitation: 0, mass: 0, communion: 0,
        servants_meeting: 0, family_meeting: 0, service: 0,
        visitationDates: new Set<number>(),
      };
      if (r.preparation) c.preparation++;
      if (r.visitation) { c.visitation++; c.visitationDates.add(r.session_id); }
      if (r.mass) c.mass++;
      if (r.communion) c.communion++;
      if (r.servants_meeting) c.servants_meeting++;
      if (r.family_meeting) c.family_meeting++;
      if (r.service) c.service++;
      counts.set(r.servant_id, c);
    }
  }

  const servants: ServantMonth[] = (servantRows ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    const c = counts.get(s.id);
    return {
      id: s.id,
      full_name: s.full_name,
      area: cls?.area ?? null,
      stage: cls?.stage ?? null,
      preparation: c?.preparation ?? 0,
      visitation: c?.visitation ?? 0,
      mass: c?.mass ?? 0,
      communion: c?.communion ?? 0,
      servants_meeting: c?.servants_meeting ?? 0,
      family_meeting: c?.family_meeting ?? 0,
      service: c?.service ?? 0,
      visitationDates: c?.visitationDates ?? new Set<number>(),
    };
  });

  servants.sort(
    (a, b) =>
      stageRank(a.stage) - stageRank(b.stage) ||
      areaRank(a.area) - areaRank(b.area) ||
      a.full_name.localeCompare(b.full_name, "ar"),
  );

  return { sessions, servants };
}
