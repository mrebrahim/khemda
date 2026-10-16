import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * حروف الكود: من غير 0 و1 و I و O عشان الولد ما يلخبطش
 * بينهم وهو بيكتب الكود من الكارت.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

export function randomCode(len: number = CODE_LENGTH): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export type EnsureResult =
  | { ok: true; code: string; created: boolean }
  | { ok: false; error: string };

/**
 * بيتأكد إن الولد معاه كود دخول. لو معندوش بيعمله واحد جديد.
 * لو الكود اتكرر (نادر) بيجرّب تاني — والتكرار الحقيقي بيمنعه
 * الـprimary key و unique index على login_code في الداتابيز.
 */
export async function ensureStudentAccount(
  studentId: number,
): Promise<EnsureResult> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("student_accounts")
    .select("login_code")
    .eq("student_id", studentId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (existing?.login_code) {
    return { ok: true, code: existing.login_code, created: false };
  }

  // المخدوم الموقوف مابياخدش كود جديد
  const { data: student } = await supabase
    .from("students")
    .select("is_active")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { ok: false, error: "المخدوم ده مش موجود" };
  if (!student.is_active) {
    return { ok: false, error: "المخدوم ده موقوف — فعّله الأول عشان ياخد كود" };
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from("student_accounts")
      .insert({ student_id: studentId, login_code: code, is_active: true });

    if (!error) return { ok: true, code, created: true };

    // 23505 = تعارض. لو التعارض على الطالب نفسه يبقى حد سبقنا وعمله حساب.
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("student_accounts")
        .select("login_code")
        .eq("student_id", studentId)
        .maybeSingle();
      if (again?.login_code) {
        return { ok: true, code: again.login_code, created: false };
      }
      continue; // التعارض كان على الكود — نجرّب كود تاني
    }

    return { ok: false, error: error.message };
  }

  return { ok: false, error: "مقدرناش نعمل كود جديد، جرّب تاني" };
}

/** الأولاد النشطين اللي لسه ملهمش كود */
export async function studentsWithoutCode(): Promise<
  { id: number; full_name: string; area: string | null; stage: string | null }[]
> {
  const supabase = await createClient();

  const [{ data: students }, { data: accounts }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, classes(area, stage)")
      .eq("is_active", true),
    supabase.from("student_accounts").select("student_id"),
  ]);

  const has = new Set((accounts ?? []).map((a) => a.student_id));

  return (students ?? [])
    .filter((s) => !has.has(s.id))
    .map((s) => {
      const cls = s.classes as unknown as { area: string; stage: string } | null;
      return {
        id: s.id,
        full_name: s.full_name,
        area: cls?.area ?? null,
        stage: cls?.stage ?? null,
      };
    });
}
