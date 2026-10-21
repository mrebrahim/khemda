"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentHero } from "@/lib/student-auth";
import {
  getEvent,
  openBox,
  readPass,
  PASS_COOKIE,
  type LuckyAttempt,
} from "@/lib/lucky";

export type DropResult =
  | { ok: true; label: string; kind: string; xp: number; taayo: number; attemptId: number }
  | { ok: false; error: string };

/** فتح الصندوق. التصريح في الكوكي هو إثبات إنه مسح الكود فعلاً. */
export async function openDrop(idempotencyKey: string): Promise<DropResult> {
  const hero = await currentHero();
  if (!hero) return { ok: false, error: "لازم تسجّل دخول الأول" };

  const jar = await cookies();
  const eventId = readPass(jar.get(PASS_COOKIE)?.value);
  if (!eventId) {
    return { ok: false, error: "امسح الكود من عند الخادم تاني" };
  }

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "الحدث ده مش موجود" };

  const key = String(idempotencyKey).slice(0, 80);
  if (key.length < 8) return { ok: false, error: "طلب مش مظبوط" };

  const res = await openBox({ event, studentId: hero.studentId, idempotencyKey: key });
  if (!res.ok) return { ok: false, error: res.error };

  const a: LuckyAttempt = res.attempt;
  revalidatePath("/hero", "layout");
  return {
    ok: true,
    label: a.prize_label ?? "مكافأة",
    kind: a.prize_kind ?? "xp",
    xp: a.prize_xp,
    taayo: a.prize_taayo,
    attemptId: a.id,
  };
}
