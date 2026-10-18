import "server-only";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/types";

const COOKIE = "hero_session";
const MAX_AGE = 60 * 60 * 24 * 120; // ٤ شهور

function secret(): string | null {
  const v = process.env.STUDENT_SESSION_SECRET;
  return v && v.length >= 16 ? v : null;
}

function sign(studentId: number, key: string): string {
  return createHmac("sha256", key).update(`hero:${studentId}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

/** كود دخول من ٦ حروف/أرقام، من غير الحروف اللي بتتلخبط (O/0/I/1) */
export function generateLoginCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export type HeroSession = {
  studentId: number;
  fullName: string;
  nickname: string | null;
  area: string | null;
  stage: string | null;
};

export async function currentHero(): Promise<HeroSession | null> {
  const key = secret();
  if (!key) return null;

  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const [idPart, sig] = raw.split(".");
  const studentId = Number(idPart);
  if (!Number.isInteger(studentId) || !sig) return null;
  if (!safeEqual(sig, sign(studentId, key))) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("student_accounts")
    .select("student_id, nickname, is_active, students(full_name, classes(area, stage))")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  const st = data.students as unknown as {
    full_name: string;
    classes: { area: string; stage: string } | null;
  } | null;

  return {
    studentId,
    fullName: st?.full_name ?? "",
    nickname: data.nickname,
    area: st?.classes?.area ?? null,
    stage: st?.classes?.stage ?? null,
  };
}

export async function heroLogin(
  loginCode: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = secret();
  if (!key) return { ok: false, error: "النظام لسه مش متظبّط — كلّم المشرف" };

  const code = loginCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return { ok: false, error: "الكود مش مظبوط" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("student_accounts")
    .select("student_id, is_active, is_demo, students!inner(is_active)")
    .eq("login_code", code)
    .maybeSingle();

  // لازم الحساب والمخدوم نفسه يكونوا نشطين — المخدوم اللي اتوقف مايدخلش.
  // الاستثناء الوحيد حساب الديمو: مخدوم موقوف عمدًا عشان ما يظهرش
  // في الكشوف، بس بيعدّي هنا عشان المشرف يجرّب.
  const student = Array.isArray(data?.students) ? data.students[0] : data?.students;
  const studentActive = (student as { is_active?: boolean } | undefined)?.is_active === true;
  if (!data || !data.is_active || (!studentActive && !data.is_demo)) {
    return { ok: false, error: "الكود ده مش موجود — اتأكد منه تاني" };
  }

  const jar = await cookies();
  jar.set(COOKIE, `${data.student_id}.${sign(data.student_id, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  await supabase
    .from("student_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("student_id", data.student_id);

  // سجل الدخول باليوم — القيد الفريد بيخلّيه صف واحد لكل يوم
  await supabase
    .from("student_logins")
    .insert({ student_id: data.student_id, on_date: todayISO() });

  return { ok: true };
}

export async function heroLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function isConfigured(): boolean {
  return secret() !== null;
}
