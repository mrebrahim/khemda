import "server-only";
import { createClient } from "@/lib/supabase/server";
import { award, reverse } from "@/lib/xp";
import { dowOf, type ChurchEvent } from "@/lib/events";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type RecordResult =
  | { ok: true; xp: number }
  | { ok: false; error: string };

/** التاريخ لازم يكون يوم الحدث نفسه — مفيش تسجيل تسبحة يوم تلات */
export function validDate(ev: ChurchEvent, date: string): boolean {
  return DATE_RE.test(date) && dowOf(date) === ev.dow;
}

async function getOrCreateSessionId(date: string): Promise<number> {
  const supabase = await createClient();

  const existing = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", date)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const created = await supabase
    .from("sessions")
    .insert({ session_date: date })
    .select("id")
    .single();
  if (!created.error) return created.data.id;

  // ممكن خادم تاني يكون أنشأها في نفس اللحظة
  const retry = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", date)
    .single();
  if (retry.error) throw new Error(created.error.message);
  return retry.data.id;
}

/**
 * مفتاح النقط. لو الحدث له خانة في كشف الحضور بنستعمل نفس شكل مفتاح
 * تسجيل الـQR، فمستحيل الولد ياخد نقط القداس أو الخدمة مرتين لنفس اليوم.
 */
function baseKey(
  ev: ChurchEvent,
  date: string,
  sessionId: number | null,
  studentId: number,
  rule: string,
): string {
  return sessionId
    ? `att:${sessionId}:${studentId}:${rule}`
    : `ev:${ev.key}:${date}:${studentId}:${rule}`;
}

/** أقصى عدد مرات نشيل ونرجّع نفس النقطة — أمان ضد لفّة لا نهائية */
export const MAX_REVISIONS = 8;

export function keyAt(base: string, rev: number): string {
  return rev === 0 ? base : `${base}#${rev}`;
}

/** العمليات الثلاثة اللي الدفتر محتاجها — متفصولة عشان تتجرّب لوحدها */
export type LedgerIO = {
  award: (key: string) => Promise<{ awarded: boolean; xp: number; reason?: string }>;
  hasRow: (key: string) => Promise<boolean>;
  reverse: (key: string) => Promise<void>;
};

/**
 * بيضيف النقطة مرة واحدة. لو الخادم شال العلامة وبعدين رجّعها،
 * القيد الأصلي بيبقى معموله قيد عكسي، فبناخد نسخة جديدة من المفتاح
 * عشان النقط ترجع فعلاً — ومن غير ما حد ياخدها مرتين.
 */
export async function awardOnceIO(
  io: LedgerIO,
  base: string,
): Promise<{ xp: number; error?: string }> {
  for (let rev = 0; rev < MAX_REVISIONS; rev++) {
    const key = keyAt(base, rev);
    const res = await io.award(key);
    if (res.awarded) return { xp: res.xp };
    if (res.reason !== "مسجّل قبل كده") return { xp: 0, error: res.reason };
    // متسجّل خلاص: لو مفيش قيد عكسي يبقى النقط في رصيده فعلاً
    if (!(await io.hasRow(`rev:${key}`))) return { xp: 0 };
  }
  return { xp: 0, error: "النقطة دي اتشالت ورجعت مرات كتير — كلّم المشرف" };
}

/** بيعمل قيد عكسي لأحدث نسخة شغّالة من المفتاح */
export async function reverseLatestIO(io: LedgerIO, base: string): Promise<void> {
  for (let rev = MAX_REVISIONS - 1; rev >= 0; rev--) {
    const key = keyAt(base, rev);
    if (!(await io.hasRow(key))) continue;
    if (await io.hasRow(`rev:${key}`)) continue;
    await io.reverse(key);
    return;
  }
}

async function ledgerIO(opts: {
  studentId: number;
  ruleCode: string;
  occurredOn: string;
  note: string;
  by: string;
  why?: string;
}): Promise<LedgerIO> {
  const supabase = await createClient();
  return {
    award: (key) =>
      award({
        studentId: opts.studentId,
        ruleCode: opts.ruleCode,
        source: "teacher",
        dedupeKey: key,
        occurredOn: opts.occurredOn,
        note: opts.note,
        createdBy: opts.by,
      }),
    hasRow: async (key) => {
      const { data } = await supabase
        .from("xp_ledger")
        .select("id")
        .eq("dedupe_key", key)
        .maybeSingle();
      return Boolean(data);
    },
    reverse: async (key) => {
      await reverse({
        dedupeKey: key,
        reason: opts.why ?? "تعديل تسجيل",
        createdBy: opts.by,
      });
    },
  };
}

async function awardOnce(opts: {
  base: string;
  studentId: number;
  ruleCode: string;
  occurredOn: string;
  note: string;
  by: string;
}): Promise<{ xp: number; error?: string }> {
  return awardOnceIO(await ledgerIO(opts), opts.base);
}

/**
 * قيد عكسي لأحدث نسخة شغّالة. الـruleCode هنا مش مهم — القيد العكسي
 * بيقرا القيد الأصلي من الدفتر.
 */
async function reverseLatest(base: string, by: string, why: string): Promise<void> {
  const io = await ledgerIO({
    studentId: 0,
    ruleCode: "admin_adjust",
    occurredOn: "1970-01-01",
    note: "",
    by,
    why,
  });
  return reverseLatestIO(io, base);
}

async function setAttendanceField(
  ev: ChurchEvent,
  sessionId: number,
  studentId: number,
  value: boolean,
): Promise<void> {
  if (!ev.field) return;
  const supabase = await createClient();
  const { error } = await supabase.from("student_attendance").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      [ev.field]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" },
  );
  if (error) throw new Error(error.message);
}

/** تسجيل ولد إنه حضر الحدث — بيرجّع النقط اللي دخلت رصيده */
export async function recordEvent(opts: {
  ev: ChurchEvent;
  date: string;
  studentId: number;
  by: string;
}): Promise<RecordResult> {
  const { ev, date, studentId, by } = opts;
  if (!validDate(ev, date)) return { ok: false, error: "التاريخ مش يوم الحدث" };

  const supabase = await createClient();
  const sessionId = ev.field ? await getOrCreateSessionId(date) : null;

  const { error } = await supabase
    .from("event_marks")
    .upsert(
      {
        student_id: studentId,
        event_key: ev.key,
        on_date: date,
        created_by: by,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,event_key,on_date", ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") return { ok: false, error: error.message };

  if (sessionId) await setAttendanceField(ev, sessionId, studentId, true);

  const res = await awardOnce({
    base: baseKey(ev, date, sessionId, studentId, ev.entryRule),
    studentId,
    ruleCode: ev.entryRule,
    occurredOn: date,
    note: `${ev.label} — تسجيل الخادم`,
    by,
  });
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, xp: res.xp };
}

/** شيل التسجيل — بيعمل قيد عكسي للنقط ومبيمسحش التاريخ */
export async function unrecordEvent(opts: {
  ev: ChurchEvent;
  date: string;
  studentId: number;
  by: string;
}): Promise<RecordResult> {
  const { ev, date, studentId, by } = opts;
  if (!validDate(ev, date)) return { ok: false, error: "التاريخ مش يوم الحدث" };

  const supabase = await createClient();
  const { data: mark } = await supabase
    .from("event_marks")
    .select("id, place")
    .eq("student_id", studentId)
    .eq("event_key", ev.key)
    .eq("on_date", date)
    .maybeSingle();

  const sessionId = ev.field ? await getOrCreateSessionId(date) : null;
  const why = `شيل تسجيل ${ev.label}`;

  if (mark?.place && ev.placeRules) {
    await reverseLatest(
      baseKey(ev, date, sessionId, studentId, ev.placeRules[mark.place - 1]),
      by,
      why,
    );
  }
  await reverseLatest(baseKey(ev, date, sessionId, studentId, ev.entryRule), by, why);

  if (sessionId) await setAttendanceField(ev, sessionId, studentId, false);

  await supabase
    .from("event_marks")
    .delete()
    .eq("student_id", studentId)
    .eq("event_key", ev.key)
    .eq("on_date", date);

  return { ok: true, xp: 0 };
}

/**
 * تحديد المركز في المسابقة. المركز واحد لكل مسابقة، فلو كان مع ولد تاني
 * بيتشال منه ونقطه بترجع. place = null يعني شيل المركز بس.
 */
export async function setEventPlace(opts: {
  ev: ChurchEvent;
  date: string;
  studentId: number;
  place: 1 | 2 | 3 | null;
  by: string;
}): Promise<RecordResult> {
  const { ev, date, studentId, place, by } = opts;
  if (!ev.placeRules) return { ok: false, error: "الحدث ده مفيهوش مراكز" };
  if (!validDate(ev, date)) return { ok: false, error: "التاريخ مش يوم الحدث" };

  const supabase = await createClient();
  const sessionId = ev.field ? await getOrCreateSessionId(date) : null;

  // لازم يكون مسجّل دخول المسابقة الأول
  const entry = await recordEvent({ ev, date, studentId, by });
  if (!entry.ok) return entry;

  const { data: rows } = await supabase
    .from("event_marks")
    .select("student_id, place")
    .eq("event_key", ev.key)
    .eq("on_date", date)
    .not("place", "is", null);

  const mine = (rows ?? []).find((r) => r.student_id === studentId);
  if ((mine?.place ?? null) === place) return { ok: true, xp: 0 };

  // شيل المركز من اللي كان واخده (ولد تاني أو نفس الولد بمركز قديم)
  for (const r of rows ?? []) {
    const takesPlace = r.place === place;
    const isMine = r.student_id === studentId;
    if (!takesPlace && !isMine) continue;
    await reverseLatest(
      baseKey(ev, date, sessionId, r.student_id, ev.placeRules[(r.place as number) - 1]),
      by,
      "تغيير ترتيب المسابقة",
    );
    await supabase
      .from("event_marks")
      .update({ place: null, updated_at: new Date().toISOString() })
      .eq("event_key", ev.key)
      .eq("on_date", date)
      .eq("student_id", r.student_id);
  }

  if (place === null) return { ok: true, xp: 0 };

  const { error: upErr } = await supabase
    .from("event_marks")
    .update({ place, updated_at: new Date().toISOString() })
    .eq("event_key", ev.key)
    .eq("on_date", date)
    .eq("student_id", studentId);
  if (upErr) return { ok: false, error: upErr.message };

  const res = await awardOnce({
    base: baseKey(ev, date, sessionId, studentId, ev.placeRules[place - 1]),
    studentId,
    ruleCode: ev.placeRules[place - 1],
    occurredOn: date,
    note: `${ev.label} — المركز ${place}`,
    by,
  });
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, xp: res.xp };
}
