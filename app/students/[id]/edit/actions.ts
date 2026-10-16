"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readStudentForm } from "@/lib/student-input";

export type EditStudentState = { error: string | null } | null;

export async function updateStudent(
  _prev: EditStudentState,
  formData: FormData,
): Promise<EditStudentState> {
  const studentId = Number(formData.get("id"));
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "المخدوم ده مش موجود" };
  }

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

  const { error } = await supabase
    .from("students")
    .update({
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
    .eq("id", studentId);

  if (error) return { error: `مشكلة في الحفظ: ${error.message}` };

  // الاسم والفصل بيظهروا في كذا صفحة
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/attendance/students");
  revalidatePath("/admin/cards");
  revalidatePath("/board");
  revalidatePath("/");

  redirect(`/students/${studentId}?saved=1`);
}

/** وقف المخدوم (ساب الخدمة) أو رجّعه تاني */
export async function setStudentActive(studentId: number, active: boolean) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { ok: false as const, error: "المخدوم ده مش موجود" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ is_active: active })
    .eq("id", studentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/attendance/students");
  revalidatePath("/admin/cards");
  revalidatePath("/");
  return { ok: true as const };
}
