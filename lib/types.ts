export type ClassRow = {
  id: number;
  area: string;
  stage: string;
  saint_name: string | null;
  sort_order: number;
};

export type Student = {
  id: number;
  full_name: string;
  class_id: number;
  phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  birth_date: string | null;
  confession_father: string | null;
  notes: string | null;
  is_active: boolean;
};

export type Servant = {
  id: number;
  full_name: string;
  class_id: number | null;
  phone: string | null;
  is_active: boolean;
};

export type Session = {
  id: number;
  session_date: string;
  is_monthly_mass: boolean;
  note: string | null;
};

export const STUDENT_FIELDS = [
  { key: "mass", label: "القداس" },
  { key: "communion", label: "التناول" },
  { key: "service", label: "الخدمة" },
  { key: "tasbeha", label: "التسبحة" },
] as const;

export const SERVANT_FIELDS = [
  { key: "preparation", label: "التحضير" },
  { key: "visitation", label: "الافتقاد" },
  { key: "mass", label: "القداس" },
  { key: "communion", label: "التناول" },
  { key: "servants_meeting", label: "اجتماع الخدام" },
  { key: "family_meeting", label: "اجتماع الأسرة" },
  { key: "service", label: "الخدمة" },
] as const;

export type StudentField = (typeof STUDENT_FIELDS)[number]["key"];
export type ServantField = (typeof SERVANT_FIELDS)[number]["key"];

export type StudentAttendance = { student_id: number } & Record<StudentField, boolean>;
export type ServantAttendance = { servant_id: number } & Record<ServantField, boolean>;

export const AREAS = ["رستم أ", "رستم ب", "الأمل"] as const;
export const STAGES = ["1ع", "2ع", "3ع"] as const;

/** يشيل التشكيل ويوحّد الألف/الياء/التاء المربوطة علشان البحث بالعربي يشتغل صح */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function todayISO(): string {
  // توقيت مصر
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatArabicDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
