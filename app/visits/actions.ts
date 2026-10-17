"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { weekStartOf } from "@/lib/visits";
import { todayISO } from "@/lib/types";

/** علامة «افتقدته الأسبوع ده» — تشغيل وإطفاء */
export async function toggleVisit(studentId: number, visited: boolean) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { ok: false as const, error: "المخدوم ده مش موجود" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "لازم تسجّل دخول" };

  const week = weekStartOf();

  if (visited) {
    // الـunique (student, week) بيمنع التكرار لو اتدوس مرتين
    const { error } = await supabase.from("student_visits").insert({
      student_id: studentId,
      week_start: week,
      visited_on: todayISO(),
      created_by: user.email ?? "servant",
    });
    if (error && error.code !== "23505") {
      return { ok: false as const, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("student_visits")
      .delete()
      .eq("student_id", studentId)
      .eq("week_start", week);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/visits");
  return { ok: true as const };
}
