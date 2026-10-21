import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { award } from "@/lib/xp";
import { todayISO } from "@/lib/types";

/**
 * صندوق الحظ. السحب نفسه بيحصل جوّه دالة في الداتابيز عشان يبقى
 * عملية واحدة ما تتقسمش: اختيار الجايزة + نقص المخزون + تسجيل
 * المحاولة. هنا بنتأكد من الأهلية ومن كود الـQR وبنضيف النقط.
 */

export type LuckyEvent = {
  id: number;
  title: string;
  status: "draft" | "active" | "ended" | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  require_attendance: boolean;
  min_level: number | null;
  max_attempts: number;
  qr_epoch: number;
};

export type LuckyPrize = {
  id: number;
  event_id: number;
  kind: "xp" | "taayo" | "badge";
  label: string;
  xp: number;
  taayo: number;
  weight: number;
  total_stock: number | null;
  remaining_stock: number | null;
  sort_order: number;
};

export type LuckyAttempt = {
  id: number;
  event_id: number;
  student_id: number;
  attempt_no: number;
  prize_kind: "xp" | "taayo" | "badge" | null;
  prize_label: string | null;
  prize_xp: number;
  prize_taayo: number;
  xp_granted: boolean;
  created_at: string;
};

/** الكود بيتغيّر كل ٣٠ ثانية */
export const QR_SECONDS = 30;

function secret(): string | null {
  const v = process.env.STUDENT_SESSION_SECRET;
  return v && v.length >= 16 ? v : null;
}

function windowNow(now = Date.now()): number {
  return Math.floor(now / 1000 / QR_SECONDS);
}

export function secondsLeftInWindow(now = Date.now()): number {
  return QR_SECONDS - Math.floor((now / 1000) % QR_SECONDS);
}

function sign(eventId: number, epoch: number, win: number, key: string): string {
  return createHmac("sha256", key)
    .update(`lucky:${eventId}:${epoch}:${win}`)
    .digest("base64url")
    .slice(0, 24);
}

/** كود مؤقت موقّع — مفيهوش بيانات ولا صلاحيات، بس رقم الحدث والوقت */
export function makeQrToken(event: LuckyEvent, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const win = windowNow(now);
  return `${event.id}.${event.qr_epoch}.${win}.${sign(event.id, event.qr_epoch, win, key)}`;
}

export type TokenCheck =
  | { ok: true; eventId: number }
  | { ok: false; reason: "bad" | "expired" | "not-configured" };

/**
 * بنقبل الشباك الحالي واللي قبله، عشان الولد اللي مسح في آخر ثانية
 * ما يتظلمش. يعني الكود عمره ٦٠ ثانية بالكتير.
 */
export function readQrToken(
  token: string,
  epochOf: (id: number) => number | null,
  now = Date.now(),
): TokenCheck {
  const key = secret();
  if (!key) return { ok: false, reason: "not-configured" };

  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "bad" };

  const eventId = Number(parts[0]);
  const epoch = Number(parts[1]);
  const win = Number(parts[2]);
  if (!Number.isInteger(eventId) || !Number.isInteger(epoch) || !Number.isInteger(win)) {
    return { ok: false, reason: "bad" };
  }

  const current = windowNow(now);
  if (win !== current && win !== current - 1) return { ok: false, reason: "expired" };

  const liveEpoch = epochOf(eventId);
  if (liveEpoch === null || liveEpoch !== epoch) return { ok: false, reason: "expired" };

  const want = sign(eventId, epoch, win, key);
  const a = Buffer.from(want);
  const b = Buffer.from(parts[3]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad" };

  return { ok: true, eventId };
}

export async function getEvent(id: number): Promise<LuckyEvent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lucky_events")
    .select(
      "id, title, status, starts_at, ends_at, require_attendance, min_level, max_attempts, qr_epoch",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as LuckyEvent | null) ?? null;
}

export type Eligibility =
  | { ok: true; left: number }
  | { ok: false; reason: string; attempt?: LuckyAttempt };

/** الشروط كلها بتتشاف على السيرفر — الواجهة مبتقررش حاجة */
export async function checkEligibility(
  event: LuckyEvent,
  studentId: number,
): Promise<Eligibility> {
  const supabase = await createClient();

  if (event.status !== "active") {
    return { ok: false, reason: "الحدث مش شغّال دلوقتي" };
  }
  const now = Date.now();
  if (event.starts_at && now < Date.parse(event.starts_at)) {
    return { ok: false, reason: "الحدث لسه ما بدأش" };
  }
  if (event.ends_at && now > Date.parse(event.ends_at)) {
    return { ok: false, reason: "الحدث خلص" };
  }

  const { data: attempts } = await supabase
    .from("lucky_attempts")
    .select("id, event_id, student_id, attempt_no, prize_kind, prize_label, prize_xp, prize_taayo, xp_granted, created_at")
    .eq("event_id", event.id)
    .eq("student_id", studentId)
    .order("attempt_no", { ascending: false });

  const used = attempts?.length ?? 0;
  if (used >= event.max_attempts) {
    return {
      ok: false,
      reason: "خلاص فتحت صندوقك النهارده 🎁",
      attempt: (attempts?.[0] as LuckyAttempt) ?? undefined,
    };
  }

  if (event.min_level) {
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    const { data: rows } = season
      ? await supabase
          .from("xp_ledger")
          .select("xp")
          .eq("student_id", studentId)
          .eq("season_id", season.id)
      : { data: [] };
    const total = (rows ?? []).reduce((n, r) => n + r.xp, 0);
    const { data: rank } = await supabase
      .from("ranks")
      .select("level")
      .lte("xp_required", total)
      .order("level", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((rank?.level ?? 1) < event.min_level) {
      return { ok: false, reason: `الصندوق ده لمستوى ${event.min_level} وفوق` };
    }
  }

  if (event.require_attendance) {
    const today = todayISO();
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("session_date", today)
      .maybeSingle();
    let present = false;
    if (session) {
      const { data: att } = await supabase
        .from("student_attendance")
        .select("service, mass")
        .eq("session_id", session.id)
        .eq("student_id", studentId)
        .maybeSingle();
      present = Boolean(att?.service || att?.mass);
    }
    if (!present) {
      return { ok: false, reason: "لازم خادمك يسجّل حضورك الأول" };
    }
  }

  return { ok: true, left: event.max_attempts - used };
}

const ERRORS: Record<string, string> = {
  event_not_found: "الحدث ده مش موجود",
  event_not_active: "الحدث مش شغّال دلوقتي",
  event_not_started: "الحدث لسه ما بدأش",
  event_ended: "الحدث خلص",
  no_attempts_left: "خلاص فتحت صندوقك 🎁",
  no_prizes_left: "الجوايز خلصت — ربنا يعوّضك المرة الجاية",
  prize_just_ran_out: "الجايزة دي خلصت في نفس اللحظة — جرّب تاني",
};

export type OpenResult =
  | { ok: true; attempt: LuckyAttempt; xp: number }
  | { ok: false; error: string };

/**
 * فتح الصندوق. الـidempotencyKey بيضمن إن لو الطلب اتبعت مرتين
 * (نت ضعيف) الولد ياخد نفس الجايزة مش سحبة جديدة.
 */
export async function openBox(opts: {
  event: LuckyEvent;
  studentId: number;
  idempotencyKey: string;
}): Promise<OpenResult> {
  const check = await checkEligibility(opts.event, opts.studentId);
  if (!check.ok) return { ok: false, error: check.reason };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lucky_open", {
    p_event: opts.event.id,
    p_student: opts.studentId,
    p_idem: opts.idempotencyKey,
  });

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? ERRORS[key] : "حصلت مشكلة، جرّب تاني" };
  }

  const attempt = (Array.isArray(data) ? data[0] : data) as LuckyAttempt;
  const xp = await grantXp(attempt);
  return { ok: true, attempt, xp };
}

/**
 * النقط بتتضاف مرة واحدة. المفتاح مربوط برقم المحاولة، فحتى لو
 * الدالة دي اتنادت ألف مرة، الدفتر مش هيقبل غير قيد واحد.
 */
export async function grantXp(attempt: LuckyAttempt): Promise<number> {
  if (attempt.prize_kind !== "xp" || attempt.prize_xp <= 0) return 0;

  const res = await award({
    studentId: attempt.student_id,
    ruleCode: "lucky_drop",
    source: "admin",
    dedupeKey: `lucky:${attempt.id}`,
    occurredOn: todayISO(),
    xpOverride: attempt.prize_xp,
    note: `صندوق الحظ — ${attempt.prize_label ?? ""}`,
    createdBy: "lucky-drop",
  });

  if (res.awarded && !attempt.xp_granted) {
    const supabase = await createClient();
    await supabase
      .from("lucky_attempts")
      .update({ xp_granted: true })
      .eq("id", attempt.id);
  }

  return attempt.prize_xp;
}

/** نسبة كل جايزة من إجمالي الأوزان المتاحة */
export function oddsOf(prizes: LuckyPrize[]): { prize: LuckyPrize; percent: number }[] {
  const live = prizes.filter((p) => p.remaining_stock === null || p.remaining_stock > 0);
  const total = live.reduce((n, p) => n + p.weight, 0);
  return prizes.map((p) => {
    const available = p.remaining_stock === null || p.remaining_stock > 0;
    return {
      prize: p,
      percent: available && total > 0 ? Math.round((p.weight / total) * 1000) / 10 : 0,
    };
  });
}

/* ── تصريح مؤقت بعد مسح الكود ──────────────────────────────── */

/**
 * بعد ما الولد يمسح الكود بنديله تصريح صالح ٥ دقايق، عشان لو قعد
 * شوية قدام الصندوق ما يتقالش «الكود خلص». التصريح موقّع وفي كوكي
 * httpOnly، فمينفعش يتعمل من الموبايل.
 */
export const PASS_SECONDS = 5 * 60;
export const PASS_COOKIE = "lucky_pass";

export function makePass(eventId: number, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Math.floor(now / 1000) + PASS_SECONDS;
  const sig = createHmac("sha256", key)
    .update(`pass:${eventId}:${exp}`)
    .digest("base64url")
    .slice(0, 24);
  return `${eventId}.${exp}.${sig}`;
}

export function readPass(value: string | undefined, now = Date.now()): number | null {
  const key = secret();
  if (!key || !value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const eventId = Number(parts[0]);
  const exp = Number(parts[1]);
  if (!Number.isInteger(eventId) || !Number.isInteger(exp)) return null;
  if (Math.floor(now / 1000) > exp) return null;

  const want = createHmac("sha256", key)
    .update(`pass:${eventId}:${exp}`)
    .digest("base64url")
    .slice(0, 24);
  const a = Buffer.from(want);
  const b = Buffer.from(parts[2]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return eventId;
}
