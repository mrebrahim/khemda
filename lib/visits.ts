import { parseAddress } from "@/lib/address";
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
 * المدينة اللي فيها كل العناوين. بتتزوّد على البحث عشان جوجل
 * ماپس ما يوديناش لشارع بنفس الاسم في محافظة تانية.
 */
export const CITY = "شبرا الخيمة";

/**
 * نص البحث اللي بيروح لجوجل ماپس.
 *
 * العنوان المكتوب فيه حاجات بتلخبط البحث — «بجوار صيدلية ممدوح»
 * و«يتم التواصل عبر التليفون» و«الدور الخامس». فبنحلّل العنوان
 * وناخد اللي ماپس بيفهمه بس: رقم البيت، الشارع، الشارع الكبير
 * اللي متفرّع منه، المنطقة، والمدينة.
 */
export function mapsQuery(address: string | null, area: string | null): string | null {
  if (!address || address.trim() === "") return null;

  const p = parseAddress(address);
  const parts = p.street
    ? [p.house !== null ? String(p.house) : "", p.street, p.parent ?? "", area, CITY]
    : [address, area, CITY];

  const q = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return q || null;
}

/**
 * لينك جوجل ماپس. مفيش إحداثيات مسجّلة، فبنبعت العنوان كبحث.
 * بياخد العنوان كـنص، فأول ما الخادم يعدّله اللينك يتحدّث لوحده.
 */
export function mapsLink(address: string | null, area: string | null): string | null {
  const q = mapsQuery(address, area);
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

/**
 * بتنضّف الرقم اللي الخادم كتبه: بتشيل المسافات والشُرط وكود
 * الدولة، وبترجّع الأرقام المصرية السليمة مفصولة بمسافة.
 *
 * لو مفيش ولا رقم مصري سليم بنسيب اللي كتبه زي ما هو — يمكن
 * يكون أرضي أو رقم ناقص عايز يفضل مكتوب لحد ما يتصلّح.
 */
export function cleanPhoneInput(raw: string | null | undefined): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  const digits = text.replace(/\D/g, "");
  const found = digits.match(EG_MOBILE);
  if (found && found.length > 0) {
    // الماتش ممكن يجي بكود الدولة («2» أو «20») قبل الـ«01»
    const fixed = [...new Set(found.map((n) => n.replace(/^(?:20|2)(?=01[0125])/, "")))];
    return fixed.join(" ");
  }
  return text.replace(/\s+/g, " ");
}
