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

/** رسالة واتساب جاهزة للافتقاد */
export function visitMessage(firstName: string): string {
  return `سلام ونعمة يا ${firstName} 👋\nوحشتنا في الخدمة — عاملين إيه؟\nممكن نعدّي عليك الأسبوع ده؟`;
}
