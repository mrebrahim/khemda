"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cleanPhoneInput, weekStartOf } from "@/lib/visits";
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

export type ContactDraft = {
  address: string;
  phone: string;
  father_phone: string;
  mother_phone: string;
};

/**
 * الخادم بيعدّل بيانات الولد من جوّه سكشن الافتقاد على طول —
 * العنوان والتليفونات — من غير ما يسيب الصفحة.
 *
 * الأرقام بتتنضّف قبل ما تتسجّل، فالخادم يكتبها بأي شكل
 * («+20 12 …» أو فيها مسافات) والسيستم يظبّطها.
 */
export async function saveContact(studentId: number, draft: ContactDraft) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { ok: false as const, error: "المخدوم ده مش موجود" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "لازم تسجّل دخول" };

  const address = String(draft.address ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const phone = cleanPhoneInput(draft.phone).slice(0, 60);
  const father_phone = cleanPhoneInput(draft.father_phone).slice(0, 60);
  const mother_phone = cleanPhoneInput(draft.mother_phone).slice(0, 60);

  const { error } = await supabase
    .from("students")
    .update({
      address: address === "" ? null : address,
      phone: phone === "" ? null : phone,
      father_phone: father_phone === "" ? null : father_phone,
      mother_phone: mother_phone === "" ? null : mother_phone,
    })
    .eq("id", studentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/visits");
  revalidatePath("/visits/streets");
  revalidatePath("/visitation");
  revalidatePath("/students");
  return { ok: true as const, address, phone, father_phone, mother_phone };
}
