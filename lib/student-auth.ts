import "server-only";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

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

export function generatePin(): string {
  return String(randomInt(1000, 10000));
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
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
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = secret();
  if (!key) return { ok: false, error: "النظام لسه مش متظبّط — كلّم المشرف" };

  const code = loginCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return { ok: false, error: "الكود مش مظبوط" };
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "الرقم السري مش مظبوط" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("student_accounts")
    .select("student_id, pin_hash, is_active")
    .eq("login_code", code)
    .maybeSingle();

  // بنقارن حتى لو الحساب مش موجود عشان الوقت ما يفرقش
  const hash = data?.pin_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const match = await bcrypt.compare(pin, hash);

  if (!data || !data.is_active || !match) {
    return { ok: false, error: "الكود أو الرقم السري غلط" };
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

  return { ok: true };
}

export async function heroLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function isConfigured(): boolean {
  return secret() !== null;
}
