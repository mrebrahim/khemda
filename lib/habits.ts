import "server-only";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/types";

export type ReminderSlot = "evening" | "night";

export type ReminderPrefs = {
  reminders_on: boolean;
  slot: ReminderSlot;
  daily_goal: number;
  paused_until: string | null;
};

export const DEFAULT_PREFS: ReminderPrefs = {
  reminders_on: true,
  slot: "evening",
  daily_goal: 2,
  paused_until: null,
};

/** الساعة دلوقتي بتوقيت مصر — التذكير بيتبع ساعة البلد مش UTC */
export function cairoHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
}

/** تاريخ قبل N يوم من يوم معيّن */
export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000,
  );
}

export async function getPrefs(studentId: number): Promise<ReminderPrefs> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminder_prefs")
    .select("reminders_on, slot, daily_goal, paused_until")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as ReminderPrefs | null) ?? DEFAULT_PREFS;
}

export async function savePrefs(
  studentId: number,
  patch: Partial<ReminderPrefs>,
): Promise<void> {
  const supabase = await createClient();
  const current = await getPrefs(studentId);
  const { error } = await supabase.from("reminder_prefs").upsert(
    {
      student_id: studentId,
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" },
  );
  if (error) throw new Error(error.message);
}

export type DayCell = {
  date: string;
  /** عدد المهمات اللي خلّصها في اليوم ده */
  count: number;
  isToday: boolean;
  /** يوم جمعة — يوم الخدمة */
  isService: boolean;
};

/**
 * آخر ٧ أيام: اليوم في الآخر.
 * بنقرا من daily_missions نفسها — مفيش جدول جديد للعادة.
 */
export async function weekOf(
  studentId: number,
  today: string = todayISO(),
): Promise<DayCell[]> {
  const from = shiftDate(today, -6);
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_missions")
    .select("on_date")
    .eq("student_id", studentId)
    .gte("on_date", from)
    .lte("on_date", today);

  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    counts.set(r.on_date, (counts.get(r.on_date) ?? 0) + 1);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(from, i);
    return {
      date,
      count: counts.get(date) ?? 0,
      isToday: date === today,
      isService: new Date(`${date}T12:00:00Z`).getUTCDay() === 5,
    };
  });
}

/** أسبوع كامل = ٧ أيام ورا بعض فيهم نشاط */
export function isPerfectWeek(week: DayCell[]): boolean {
  return week.length === 7 && week.every((d) => d.count > 0);
}

export type ReminderKind = "daily" | "last_chance" | "winback";

/**
 * نوع التذكير المناسب لولد في اللحظة دي — أو null يعني مفيش.
 * اتعزلت هنا عشان تتجرّب لوحدها بعيد عن الشبكة والداتابيز.
 */
export function pickReminder(input: {
  /** عدد المهمات اللي خلّصها النهارده */
  done: number;
  goal: number;
  streak: number;
  /** كام يوم عدّى من آخر نشاط (999 = عمره ما بدأ) */
  idle: number;
  /** الساعة بتوقيت مصر */
  hour: number;
  slot: ReminderSlot;
  remindersOn: boolean;
  pausedUntil: string | null;
  today: string;
  /** أنواع التذكير اللي اتبعتت له النهارده */
  sentToday: Set<ReminderKind>;
  /** آخر مرة اتبعتله رسالة رجوع */
  lastWinback: string | null;
}): ReminderKind | null {
  const { done, goal, streak, idle, hour, slot, today } = input;

  if (!input.remindersOn) return null;
  if (input.pausedUntil && input.pausedUntil >= today) return null;
  if (done >= goal) return null;

  const isLate = hour >= 21 || hour <= 1;

  // غايب من فترة — رسالة رجوع مرة كل أسبوع بالكتير
  if (idle >= 3 && isLate && !input.sentToday.has("winback")) {
    if (!input.lastWinback || daysBetween(input.lastWinback, today) >= 7) return "winback";
    return null;
  }

  // سلسلته هتقطع والوقت اتأخر — آخر فرصة
  if (isLate && streak >= 2 && idle === 1 && !input.sentToday.has("last_chance")) {
    return "last_chance";
  }

  // التذكير العادي في الميعاد اللي اختاره
  if (!input.sentToday.has("daily")) {
    const inSlot = slot === "night" ? isLate : hour >= 16 && hour <= 20;
    if (inSlot) return "daily";
  }

  return null;
}
