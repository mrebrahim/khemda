import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "servants_access";
const MESSAGE = "servants-access-v1";
const MAX_AGE = 60 * 60 * 24 * 30; // ٣٠ يوم

/**
 * الكود السري بييجي من متغيّر البيئة، مش من الكود المرفوع.
 * الريبو عام، فلو الكود كان مكتوب في ملف كان أي حد هيقراه.
 */
function passcode(): string | null {
  const value = process.env.SERVANTS_PASSCODE;
  return value && value.length > 0 ? value : null;
}

/**
 * قيمة الكوكي بتتوقّع بالكود السري نفسه كمفتاح،
 * فمحدش يقدر يزوّر كوكي من غير ما يعرف الكود.
 */
function expectedToken(secret: string): string {
  return createHmac("sha256", secret).update(MESSAGE).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type GateState = "open" | "locked" | "not-configured";

export async function servantsGateState(): Promise<GateState> {
  const secret = passcode();
  // لو الكود مش متظبّط، السكشن بيتقفل — مش بيتفتح للكل.
  if (!secret) return "not-configured";

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return "locked";

  return safeEqual(token, expectedToken(secret)) ? "open" : "locked";
}

/** بيتأكد من الكود وبيفتح القفل. بيرجّع false لو الكود غلط. */
export async function unlock(input: string): Promise<boolean> {
  const secret = passcode();
  if (!secret) return false;
  if (!safeEqual(input, secret)) return false;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, expectedToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return true;
}

export async function lock(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
