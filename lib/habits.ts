import "server-only";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/types";

export type ReminderSlot = "morning" | "night";

/** المهمات بتفتح ٧ بالليل بتوقيت مصر وبتقفل نص الليل */
export const OPEN_HOUR = 19;

/**
 * شباك إرسال التذكير بتوقيت مصر.
 * الكرون على UTC ومصر بتغيّر ساعتها، فبنشغّل جولتين (16:00 و17:00 UTC)
 * وواحدة بس منهم بتلاقي الساعة ٧ بالليل في مصر — صيفي وشتوي.
 */
export function inReminderWindow(hour: number): boolean {
  return hour >= OPEN_HOUR && hour <= OPEN_HOUR + 2;
}

export type ReminderPrefs = {
  reminders_on: boolean;
  slot: ReminderSlot;
  daily_goal: number;
  paused_until: string | null;
};

export const DEFAULT_PREFS: ReminderPrefs = {
  reminders_on: true,
  slot: "morning",
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

/** ثواني عدّت من نص الليل بتوقيت مصر */
export function cairoSecondsOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // بعض المناطق بترجّع 24 بدل 0 في منتصف الليل
  const h = get("hour") % 24;
  return h * 3600 + get("minute") * 60 + get("second");
}

export type MissionWindow = {
  /** المهمات مفتوحة دلوقتي؟ */
  open: boolean;
  /** لو مقفولة: فاضل كام ثانية على ما تفتح */
  secondsToOpen: number;
  /** لو مفتوحة: فاضل كام ثانية على ما تقفل (نص الليل) */
  secondsToClose: number;
  /** فاضل كام ثانية على فتح بكره — للمهمة اللي خلّصها */
  secondsToNextOpen: number;
};

const DAY = 86_400;

export function missionWindow(now: Date = new Date()): MissionWindow {
  const sec = cairoSecondsOfDay(now);
  const openAt = OPEN_HOUR * 3600;

  if (sec < openAt) {
    return {
      open: false,
      secondsToOpen: openAt - sec,
      secondsToClose: 0,
      secondsToNextOpen: openAt - sec,
    };
  }

  return {
    open: true,
    secondsToOpen: 0,
    secondsToClose: DAY - sec,
    secondsToNextOpen: DAY - sec + openAt,
  };
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
  remindersOn: boolean;
  pausedUntil: string | null;
  today: string;
  /** أنواع التذكير اللي اتبعتت له النهارده */
  sentToday: Set<ReminderKind>;
  /** آخر مرة اتبعتله رسالة رجوع */
  lastWinback: string | null;
}): ReminderKind | null {
  const { done, goal, streak, idle, hour, today } = input;

  if (!input.remindersOn) return null;
  if (input.pausedUntil && input.pausedUntil >= today) return null;
  if (done >= goal) return null;
  // التذكير بيتبعت أول ما المهمات تفتح
  if (!inReminderWindow(hour)) return null;

  // غايب من فترة — رسالة رجوع مرة كل أسبوع بالكتير
  if (idle >= 3 && !input.sentToday.has("winback")) {
    if (!input.lastWinback || daysBetween(input.lastWinback, today) >= 7) return "winback";
    return null;
  }

  // سلسلته هتقطع والمهمات لسه فاتحة شوية — آخر فرصة
  if (streak >= 2 && idle === 1 && !input.sentToday.has("last_chance")) {
    return "last_chance";
  }

  if (!input.sentToday.has("daily")) return "daily";

  return null;
}
