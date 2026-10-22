import { todayISO } from "@/lib/types";

/** أول يوم في الأسبوع (السبت) — الجمعة آخر يوم فيه */
export function weekStartOf(iso: string = todayISO()): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const back = (d.getUTCDay() + 1) % 7; // السبت = 6 → صفر
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export function weeksBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T12:00:00Z`);
  const b = Date.parse(`${toIso}T12:00:00Z`);
  return Math.floor((b - a) / (7 * 86_400_000));
}

/** رقم مصري بالصيغة الدولية — واتساب عايزه كده */
export function intlPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("20") ? digits : `20${digits.replace(/^0+/, "")}`;
}

export function waLink(phone: string | null, text: string): string | null {
  const intl = intlPhone(phone);
  return intl ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}` : null;
}

export function telLink(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? `tel:${digits}` : null;
}

/**
 * لينك جوجل ماپس. مفيش إحداثيات مسجّلة، فبنبعت العنوان كما هو
 * مع اسم المنطقة عشان البحث يقرب أكتر.
 */
export function mapsLink(address: string | null, area: string | null): string | null {
  // من غير عنوان مكتوب، اسم المنطقة لوحده مش هيوصّل لحد — فمفيش لينك
  if (!address || address.trim() === "") return null;
  const q = [address, area].filter(Boolean).join(" ").trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** رسالة واتساب جاهزة — بتتبعت باسم الولد الأول */
export function visitMessage(firstName: string): string {
  return `ازيك ${firstName} 👋\nكنت حابب أشوفك يوم الجمعة الساعة ٢ م في مدارس الأحد في الدور السابع\nهستناك 🙌`;
}

export type Phone = { label: string; number: string };

/**
 * الموبايل المصري: 01 وبعدها 0 أو 1 أو 2 أو 5، وبعدها ٨ أرقام.
 * (010 فودافون • 011 اتصالات • 012 أورنج • 015 وي)
 * الـ20 في الأول اختيارية — بعض الأرقام متسجّلة بكود الدولة.
 */
const EG_MOBILE = /(?:20|2)?01[0125]\d{8}/g;

export function isEgyptMobile(digits: string): boolean {
  return new RegExp(`^${EG_MOBILE.source}$`).test(digits);
}

/**
 * بعض الأرقام متسجّلة ملزوقة في بعض («0127...01222...»).
 * الدالة دي بتفصلهم لأرقام مصرية سليمة. ولو الرقم مش موبايل
 * مصري (أرضي مثلاً) بنسيبه زي ما هو بدل ما نضيّعه.
 */
export function splitPhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];

  const found = digits.match(EG_MOBILE);
  if (found && found.length > 0) return [...new Set(found)];
  return digits.length >= 7 ? [digits] : [];
}

/** كل أرقام الولد بترتيب الأولوية ومعاها صاحب الرقم */
export function phonesOf(student: {
  phone?: string | null;
  father_phone?: string | null;
  mother_phone?: string | null;
}): Phone[] {
  const out: Phone[] = [];
  const seen = new Set<string>();
  const add = (label: string, raw: string | null | undefined) => {
    const list = splitPhones(raw).filter((n) => {
      const key = n.replace(/^2/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // الرقم الواحد بيفضل باسمه، واللي أكتر من رقم بياخد ترقيم
    list.forEach((n, i) => {
      out.push({ label: list.length > 1 ? `${label} ${i + 1}` : label, number: n });
    });
  };
  add("الولد", student.phone);
  add("بابا", student.father_phone);
  add("ماما", student.mother_phone);
  return out;
}
