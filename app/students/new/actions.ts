"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readStudentForm } from "@/lib/student-input";
import { ensureStudentAccount } from "@/lib/student-code";

export type NewStudentState = { error: string | null } | null;

export async function createStudent(
  _prev: NewStudentState,
  formData: FormData,
): Promise<NewStudentState> {
  const parsed = readStudentForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const supabase = await createClient();

  const { data: cls, error: clsError } = await supabase
    .from("classes")
    .select("id")
    .eq("area", v.area)
    .eq("stage", v.stage)
    .maybeSingle();

  if (clsError) return { error: `مشكلة في قراءة الفصل: ${clsError.message}` };
  if (!cls) return { error: "الفصل ده مش موجود" };

  const { data: created, error } = await supabase
    .from("students")
    .insert({
      full_name: v.full_name,
      class_id: cls.id,
      phone: v.phone,
      father_phone: v.father_phone,
      mother_phone: v.mother_phone,
      address: v.address,
      birth_date: v.birth_date,
      confession_father: v.confession_father,
      notes: v.notes,
    })
    .select("id")
    .single();

  if (error) return { error: `مشكلة في الحفظ: ${error.message}` };

  // كل مخدوم جديد بياخد كود دخول على طول — الكارت والـQR بيتولّدوا منه
  await ensureStudentAccount(created.id);

  revalidatePath("/students");
  revalidatePath("/admin/cards");
  revalidatePath("/attendance/students");
  revalidatePath("/");
  redirect(`/students/${created.id}?added=1`);
}

/** بيدوّر على أسماء قريبة عشان ننبّه لو المخدوم متسجّل قبل كده */
export async function findSimilar(name: string) {
  const q = name.trim();
  if (q.length < 3) return [];

  // % و _ ليهم معنى خاص في ilike، فلازم يتهربوا عشان يتعاملوا كحروف عادية
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, classes(area, stage)")
    .ilike("full_name", `%${escaped}%`)
    .limit(5);

  return (data ?? []).map((s) => {
    const cls = s.classes as unknown as { area: string; stage: string } | null;
    return {
      id: s.id,
      full_name: s.full_name,
      label: [cls?.area, cls?.stage].filter(Boolean).join(" — "),
    };
  });
}
