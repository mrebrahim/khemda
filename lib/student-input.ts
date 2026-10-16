import { AREAS, STAGES } from "@/lib/types";

/** بيسيب القيمة الفاضية null بدل نص فاضي */
export function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length > 0 ? s : null;
}

/** بيشيل أي حاجة مش رقم، وبيزوّد صفر لو الرقم ناقصه */
export function cleanPhone(v: FormDataEntryValue | null): string | null {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  return digits;
}

export type StudentFields = {
  full_name: string;
  area: string;
  stage: string;
  phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  birth_date: string | null;
  confession_father: string | null;
  notes: string | null;
};

/** بيتأكد من البيانات اللي جاية من الفورم ويرجّعها منضّفة */
export function readStudentForm(
  formData: FormData,
): { ok: true; value: StudentFields } | { ok: false; error: string } {
  const fullName = clean(formData.get("full_name"));
  const area = clean(formData.get("area"));
  const stage = clean(formData.get("stage"));

  if (!fullName) return { ok: false, error: "اكتب اسم المخدوم" };
  if (!area || !(AREAS as readonly string[]).includes(area)) {
    return { ok: false, error: "اختار المنطقة" };
  }
  if (!stage || !(STAGES as readonly string[]).includes(stage)) {
    return { ok: false, error: "اختار المرحلة" };
  }

  const birthDate = clean(formData.get("birth_date"));
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false, error: "تاريخ الميلاد مش مظبوط" };
  }

  return {
    ok: true,
    value: {
      full_name: fullName,
      area,
      stage,
      phone: cleanPhone(formData.get("phone")),
      father_phone: cleanPhone(formData.get("father_phone")),
      mother_phone: cleanPhone(formData.get("mother_phone")),
      address: clean(formData.get("address")),
      birth_date: birthDate,
      confession_father: clean(formData.get("confession_father")),
      notes: clean(formData.get("notes")),
    },
  };
}
