"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS, STAGES } from "@/lib/types";

/** بيسيب القيمة الفاضية null بدل نص فاضي */
function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length > 0 ? s : null;
}

/** بيشيل أي حاجة مش رقم، وبيزوّد صفر لو الرقم ناقصه */
function cleanPhone(v: FormDataEntryValue | null): string | null {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  return digits;
}

export type NewStudentState = { error: string | null } | null;

export async function createStudent(
  _prev: NewStudentState,
  formData: FormData,
): Promise<NewStudentState> {
  const fullName = clean(formData.get("full_name"));
  const area = clean(formData.get("area"));
  const stage = clean(formData.get("stage"));

  if (!fullName) return { error: "اكتب اسم المخدوم" };
  if (!area || !(AREAS as readonly string[]).includes(area)) {
    return { error: "اختار المنطقة" };
  }
  if (!stage || !(STAGES as readonly string[]).includes(stage)) {
    return { error: "اختار المرحلة" };
  }

  const birthDate = clean(formData.get("birth_date"));
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { error: "تاريخ الميلاد مش مظبوط" };
  }

  const supabase = await createClient();

  const { data: cls, error: clsError } = await supabase
    .from("classes")
    .select("id")
    .eq("area", area)
    .eq("stage", stage)
    .maybeSingle();

  if (clsError) return { error: `مشكلة في قراءة الفصل: ${clsError.message}` };
  if (!cls) return { error: "الفصل ده مش موجود" };

  const { data: created, error } = await supabase
    .from("students")
    .insert({
      full_name: fullName,
      class_id: cls.id,
      phone: cleanPhone(formData.get("phone")),
      father_phone: cleanPhone(formData.get("father_phone")),
      mother_phone: cleanPhone(formData.get("mother_phone")),
      address: clean(formData.get("address")),
      birth_date: birthDate,
      confession_father: clean(formData.get("confession_father")),
      notes: clean(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error) return { error: `مشكلة في الحفظ: ${error.message}` };

  revalidatePath("/students");
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
