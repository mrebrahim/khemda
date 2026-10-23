"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventByKey } from "@/lib/events";
import {
  markOf,
  recordByToken,
  recordEvent,
  setEventBonus,
  setEventPlace,
  unrecordEvent,
  type ScanOutcome,
} from "@/lib/events-record";
import { lookupToken, type ScanTarget } from "@/lib/checkin";

async function servant(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? (user.email ?? "servant") : null;
}

export type ToggleResult =
  | { ok: true; xp: number }
  | { ok: false; error: string };

/** علامة «حضر» — تشغيل وإطفاء */
export async function toggleEventMark(
  eventKey: string,
  date: string,
  studentId: number,
  present: boolean,
): Promise<ToggleResult> {
  const ev = eventByKey(eventKey);
  if (!ev) return { ok: false, error: "الحدث ده مش موجود" };
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { ok: false, error: "المخدوم ده مش موجود" };
  }

  const by = await servant();
  if (!by) return { ok: false, error: "لازم تسجّل دخول" };

  const res = present
    ? await recordEvent({ ev, date, studentId, by })
    : await unrecordEvent({ ev, date, studentId, by });

  if (res.ok) revalidatePath(`/events/${ev.key}`);
  return res;
}

/** المركز الأول/التاني/التالت في المسابقة — أو null لشيله */
export async function setPlace(
  eventKey: string,
  date: string,
  studentId: number,
  place: number | null,
): Promise<ToggleResult> {
  const ev = eventByKey(eventKey);
  if (!ev) return { ok: false, error: "الحدث ده مش موجود" };
  if (place !== null && ![1, 2, 3].includes(place)) {
    return { ok: false, error: "المركز لازم يكون ١ أو ٢ أو ٣" };
  }

  const by = await servant();
  if (!by) return { ok: false, error: "لازم تسجّل دخول" };

  const res = await setEventPlace({
    ev,
    date,
    studentId,
    place: place as 1 | 2 | 3 | null,
    by,
  });

  if (res.ok) revalidatePath(`/events/${ev.key}`);
  return res;
}

/** تسجيل فصل كامل مرة واحدة — للخادم اللي فصله حضر كله */
export async function markClass(
  eventKey: string,
  date: string,
  studentIds: number[],
): Promise<{ ok: true; added: number; xp: number } | { ok: false; error: string }> {
  const ev = eventByKey(eventKey);
  if (!ev) return { ok: false, error: "الحدث ده مش موجود" };

  const by = await servant();
  if (!by) return { ok: false, error: "لازم تسجّل دخول" };

  const ids = studentIds.filter((n) => Number.isInteger(n) && n > 0).slice(0, 60);
  let added = 0;
  let xp = 0;
  for (const id of ids) {
    const res = await recordEvent({ ev, date, studentId: id, by });
    if (!res.ok) return { ok: false, error: res.error };
    if (res.xp > 0) added++;
    xp += res.xp;
  }

  revalidatePath(`/events/${ev.key}`);
  return { ok: true, added, xp };
}

/** بونص من بونصات الحدث — زي «قرا في القداس» أو «الدرجة كاملة» */
export async function setBonus(
  eventKey: string,
  date: string,
  studentId: number,
  rule: string,
  on: boolean,
): Promise<ToggleResult> {
  const ev = eventByKey(eventKey);
  if (!ev) return { ok: false, error: "الحدث ده مش موجود" };

  const by = await servant();
  if (!by) return { ok: false, error: "لازم تسجّل دخول" };

  const res = await setEventBonus({ ev, date, studentId, rule, on, by });
  if (res.ok) revalidatePath(`/events/${ev.key}`);
  return res;
}

/** الخطوة الأولى في المسح: مين ده، ومتسجّل خلاص ولا لأ */
export async function identifyForEvent(
  eventKey: string,
  date: string,
  token: string,
): Promise<(ScanTarget & { alreadyHere: boolean; bonuses: string[] }) | null> {
  const ev = eventByKey(eventKey);
  if (!ev) return null;
  if (!(await servant())) return null;

  const target = await lookupToken(token);
  if (!target) return null;

  const mark = await markOf(ev, date, target.studentId);
  return { ...target, alreadyHere: mark !== null, bonuses: mark?.bonuses ?? [] };
}

/**
 * الخطوة التانية: سجّل الحضور بالكود.
 *
 * `rules` هي البونصات اللي الخادم علّمها في شاشة المسح — زي
 * «حضر القرايات» و«قرا في القداس». بتتسجّل مع الحضور في نفس
 * الدوسة.
 */
export async function scanForEvent(
  eventKey: string,
  date: string,
  token: string,
  rules: string[] = [],
): Promise<ScanOutcome> {
  const ev = eventByKey(eventKey);
  if (!ev) return { status: "unknown" };

  const by = await servant();
  if (!by) return { status: "unknown" };

  const res = await recordByToken({ ev, date, token, by });

  // الحضور اتسجّل (أو كان متسجّل) — نظبّط البونصات زي ما الخادم علّمها
  if (res.status === "ok" || res.status === "already") {
    const target = await lookupToken(token);
    if (target) {
      const wanted = rules.filter((r) => ev.bonuses.some((b) => b.rule === r));
      const current = (await markOf(ev, date, target.studentId))?.bonuses ?? [];
      for (const b of ev.bonuses) {
        const on = wanted.includes(b.rule);
        if (on === current.includes(b.rule)) continue;
        const set = await setEventBonus({
          ev,
          date,
          studentId: target.studentId,
          rule: b.rule,
          on,
          by,
        });
        if (set.ok && on && res.status === "ok") res.xp += set.xp;
      }
    }
  }

  revalidatePath(`/events/${ev.key}`);
  return res;
}
