import { shiftDate, todayISO, type StudentField } from "@/lib/types";

/** مواعيد الخدمة الأسبوعية — ده المصدر الوحيد للمعاد والنقط والتذكير */
export type EventKey =
  | "tasbeha"
  | "quiz_thu"
  | "mass"
  | "sunday_school"
  | "quiz_fri";

export type ChurchEvent = {
  key: EventKey;
  label: string;
  short: string;
  emoji: string;
  /** يوم الأسبوع: ٠ الأحد … ٦ السبت */
  dow: number;
  /** الساعة والدقيقة بتوقيت مصر */
  hour: number;
  minute: number;
  where: string | null;
  /** قاعدة نقط الحضور/المشاركة */
  entryRule: string;
  /** قواعد المركز الأول والثاني والتالت — للمسابقات بس */
  placeRules: readonly [string, string, string] | null;
  /** بونص زيادة (الدرجة النهائية في المسابقة) */
  bonusRule: string | null;
  bonusLabel: string | null;
  /** الخانة المقابلة في كشف الحضور عشان التقارير تفضل مظبوطة */
  field: StudentField | null;
  /** يتبعت تذكير في معاده؟ */
  remind: boolean;
  /** نص التذكير اللي يوصل للولد */
  reminder: { title: string; body: string } | null;
};

export const EVENTS: readonly ChurchEvent[] = [
  {
    key: "tasbeha",
    label: "التسبحة",
    short: "تسبحة",
    emoji: "🎶",
    dow: 0,
    hour: 19,
    minute: 0,
    where: null,
    entryRule: "tasbeha",
    placeRules: null,
    bonusRule: null,
    bonusLabel: null,
    field: "tasbeha",
    remind: true,
    reminder: {
      title: "🎶 التسبحة بدأت!",
      body: "تعالى سبّح معانا — الحضور بيدخل في رصيدك نقط",
    },
  },
  {
    key: "quiz_thu",
    label: "مسابقة الخميس",
    short: "مسابقة الخميس",
    emoji: "🧠",
    dow: 4,
    hour: 21,
    minute: 0,
    where: null,
    entryRule: "quiz_thu_entry",
    placeRules: ["quiz_thu_1st", "quiz_thu_2nd", "quiz_thu_3rd"] as const,
    bonusRule: "quiz_full",
    bonusLabel: "الدرجة كاملة",
    field: null,
    remind: true,
    reminder: {
      title: "🧠 مسابقة الخميس فتحت!",
      body: "دخولك لوحده نقط — والأول والتاني والتالت ليهم بونص كبير",
    },
  },
  {
    key: "mass",
    label: "القداس",
    short: "قداس",
    emoji: "⛪",
    dow: 5,
    hour: 7,
    minute: 0,
    where: null,
    entryRule: "mass",
    placeRules: null,
    bonusRule: null,
    bonusLabel: null,
    field: "mass",
    remind: true,
    reminder: {
      title: "⛪ القداس دلوقتي",
      body: "صحصح يا بطل — القداس أكبر نقط في الأسبوع",
    },
  },
  {
    key: "sunday_school",
    label: "مدارس الأحد",
    short: "الخدمة",
    emoji: "🧒",
    dow: 5,
    hour: 14,
    minute: 0,
    where: "الدور السابع",
    entryRule: "sunday_school",
    placeRules: null,
    bonusRule: null,
    bonusLabel: null,
    field: "service",
    remind: true,
    reminder: {
      title: "🧒 مدارس الأحد — الدور السابع",
      body: "الاجتماع بدأ، استنيينك — وخد نقطك كاملة",
    },
  },
  {
    key: "quiz_fri",
    label: "مسابقة الفصل",
    short: "مسابقة الفصل",
    emoji: "🏅",
    dow: 5,
    hour: 15,
    minute: 0,
    where: "جوّه الفصل",
    entryRule: "quiz_fri_entry",
    placeRules: ["quiz_fri_1st", "quiz_fri_2nd", "quiz_fri_3rd"] as const,
    bonusRule: "quiz_full",
    bonusLabel: "الدرجة كاملة",
    field: null,
    remind: false,
    reminder: null,
  },
] as const;

export function eventByKey(key: string): ChurchEvent | null {
  return EVENTS.find((e) => e.key === key) ?? null;
}

export const DOW_AR = [
  "الأحد",
  "الاتنين",
  "التلات",
  "الأربع",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

/** يوم الأسبوع لتاريخ مكتوب YYYY-MM-DD */
export function dowOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** ٧:٠٠ م — بالعربي */
export function timeLabel(ev: ChurchEvent): string {
  const h12 = ev.hour % 12 === 0 ? 12 : ev.hour % 12;
  const suffix = ev.hour < 12 ? "ص" : "م";
  const mm = String(ev.minute).padStart(2, "0");
  return `${h12}:${mm} ${suffix}`;
}

export function whenLabel(ev: ChurchEvent): string {
  const base = `${DOW_AR[ev.dow]} ${timeLabel(ev)}`;
  return ev.where ? `${base} — ${ev.where}` : base;
}

/**
 * آخر مرة جه فيها معاد الحدث — ده التاريخ اللي الخادم بيسجّل عليه.
 * لو النهارده يوم الحدث، بيرجّع النهارده (حتى لو المعاد لسه ما جاش،
 * عشان الخادم يقدر يفتح الشاشة ويجهّزها قبل الميعاد).
 */
export function lastOccurrence(ev: ChurchEvent, today: string = todayISO()): string {
  const back = (dowOf(today) - ev.dow + 7) % 7;
  return shiftDate(today, -back);
}

/** آخر N مرات حصل فيهم الحدث — الأحدث الأول */
export function recentOccurrences(
  ev: ChurchEvent,
  count: number,
  today: string = todayISO(),
): string[] {
  const last = lastOccurrence(ev, today);
  return Array.from({ length: count }, (_, i) => shiftDate(last, -7 * i));
}

/** الحدث مفتوح للتسجيل من معاده ولحد ساعتين بعده */
export const LIVE_SECONDS = 2 * 3600;

export type EventTiming = {
  /** شغّال دلوقتي */
  live: boolean;
  /** فاضل كام ثانية على المعاد الجاي */
  secondsToNext: number;
  /** تاريخ المعاد الجاي */
  nextDate: string;
  /** لو شغّال: فاضل كام ثانية على ما يخلص */
  secondsLeft: number;
};

/**
 * حساب المعاد بتوقيت مصر. الثواني بتتحسب على السيرفر وبتتبعت للعدّاد
 * عشان ساعة الموبايل لو مظبوطة غلط ما تأثرش.
 */
export function timingOf(
  ev: ChurchEvent,
  today: string,
  secondsOfDay: number,
): EventTiming {
  const at = ev.hour * 3600 + ev.minute * 60;
  const isDay = dowOf(today) === ev.dow;
  const live = isDay && secondsOfDay >= at && secondsOfDay < at + LIVE_SECONDS;

  let ahead = (ev.dow - dowOf(today) + 7) % 7;
  if (ahead === 0 && secondsOfDay >= at) ahead = 7;

  return {
    live,
    secondsToNext: ahead * 86_400 + at - secondsOfDay,
    nextDate: shiftDate(today, ahead),
    secondsLeft: live ? at + LIVE_SECONDS - secondsOfDay : 0,
  };
}

/** الأحداث اللي معادها دلوقتي بالظبط — دي اللي التذكير بيتبعت عليها */
export function dueEvents(today: string, hour: number): ChurchEvent[] {
  const dow = dowOf(today);
  return EVENTS.filter((e) => e.remind && e.dow === dow && e.hour === hour);
}

/** ١ يوم ٣ س — أو ٣ س ٠٥ د — أو ٠٥ د ١٢ ث */
export function formatLeft(total: number): string {
  const t = Math.max(0, total);
  const d = Math.floor(t / 86_400);
  const h = Math.floor((t % 86_400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${d} ${d === 1 ? "يوم" : d === 2 ? "يومين" : "أيام"} ${h} س`;
  if (h > 0) return `${h} س ${String(m).padStart(2, "0")} د`;
  if (m > 0) return `${m} د ${String(s).padStart(2, "0")} ث`;
  return `${s} ث`;
}

export const PLACE_LABEL = ["المركز الأول", "المركز التاني", "المركز التالت"] as const;
export const PLACE_MEDAL = ["🥇", "🥈", "🥉"] as const;
