"use server";

import { createClient } from "@/lib/supabase/server";
import {
  STUDENT_FIELDS,
  SERVANT_FIELDS,
  type StudentField,
  type ServantField,
} from "@/lib/types";

const STUDENT_KEYS = new Set<string>(STUDENT_FIELDS.map((f) => f.key));
const SERVANT_KEYS = new Set<string>(SERVANT_FIELDS.map((f) => f.key));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** بيجيب الجلسة بتاريخ معيّن أو بينشئها لو مش موجودة */
async function getOrCreateSessionId(date: string): Promise<number> {
  if (!DATE_RE.test(date)) throw new Error("تاريخ غير صالح");
  const supabase = await createClient();

  const existing = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", date)
    .maybeSingle();

  if (existing.data) return existing.data.id;

  const created = await supabase
    .from("sessions")
    .insert({ session_date: date })
    .select("id")
    .single();

  if (created.error) {
    // ممكن حد تاني يكون أنشأها في نفس اللحظة
    const retry = await supabase
      .from("sessions")
      .select("id")
      .eq("session_date", date)
      .single();
    if (retry.error) throw new Error(created.error.message);
    return retry.data.id;
  }

  return created.data.id;
}

export async function setStudentMark(
  date: string,
  studentId: number,
  field: StudentField,
  value: boolean,
) {
  if (!STUDENT_KEYS.has(field)) throw new Error("خانة غير معروفة");
  const supabase = await createClient();
  const sessionId = await getOrCreateSessionId(date);

  const { error } = await supabase.from("student_attendance").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      [field]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" },
  );

  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function setServantMark(
  date: string,
  servantId: number,
  field: ServantField,
  value: boolean,
) {
  if (!SERVANT_KEYS.has(field)) throw new Error("خانة غير معروفة");
  const supabase = await createClient();
  const sessionId = await getOrCreateSessionId(date);

  const { error } = await supabase.from("servant_attendance").upsert(
    {
      session_id: sessionId,
      servant_id: servantId,
      [field]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,servant_id" },
  );

  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** علامة "ده القداس الشهري" — بتتسجّل على اليوم كله */
export async function setMonthlyMass(date: string, value: boolean) {
  const supabase = await createClient();
  const sessionId = await getOrCreateSessionId(date);

  const { error } = await supabase
    .from("sessions")
    .update({ is_monthly_mass: value })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  return { ok: true as const };
}
