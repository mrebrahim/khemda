"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventByKey } from "@/lib/events";
import { recordEvent, setEventPlace, unrecordEvent } from "@/lib/events-record";

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
