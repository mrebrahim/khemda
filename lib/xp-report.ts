import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * تقرير النقط: الولد خد كام، على إيه، ويوم إيه.
 *
 * بيتقرا من سجل النقط نفسه (xp_ledger) — يعني اللي مكتوب هنا
 * هو بالظبط اللي اتحسب في رصيده، مفيش حساب تاني ممكن يختلف.
 */

export type XpEntry = {
  id: number;
  date: string;
  ruleCode: string;
  label: string;
  xp: number;
  note: string | null;
  verified: boolean;
};

export type XpGroup = {
  ruleCode: string;
  label: string;
  count: number;
  xp: number;
};

export type XpReport = {
  total: number;
  /** مجمّع حسب النشاط، الأكتر نقط الأول */
  groups: XpGroup[];
  /** كل حركة بتاريخها، الأحدث الأول */
  entries: XpEntry[];
  /** نقط اتخصمت (هدايا) — بتتعرض لوحدها */
  spent: number;
};

export async function xpReport(
  studentId: number,
  seasonId: number | null,
): Promise<XpReport> {
  const empty: XpReport = { total: 0, groups: [], entries: [], spent: 0 };
  if (!seasonId) return empty;

  const supabase = await createAdminClient();
  const [{ data: rows }, { data: rules }] = await Promise.all([
    supabase
      .from("xp_ledger")
      .select("id, xp, rule_code, occurred_on, note, is_verified")
      .eq("student_id", studentId)
      .eq("season_id", seasonId)
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from("activity_rules").select("code, name_ar"),
  ]);

  const nameOf = new Map((rules ?? []).map((r) => [r.code, r.name_ar as string]));

  const entries: XpEntry[] = (rows ?? []).map((r) => ({
    id: r.id,
    date: r.occurred_on,
    ruleCode: r.rule_code,
    label: nameOf.get(r.rule_code) ?? r.rule_code,
    xp: r.xp,
    note: r.note,
    verified: r.is_verified,
  }));

  const by = new Map<string, XpGroup>();
  let total = 0;
  let spent = 0;

  for (const e of entries) {
    total += e.xp;
    if (e.xp < 0) spent += -e.xp;
    const g = by.get(e.ruleCode) ?? {
      ruleCode: e.ruleCode,
      label: e.label,
      count: 0,
      xp: 0,
    };
    g.count += 1;
    g.xp += e.xp;
    by.set(e.ruleCode, g);
  }

  const groups = [...by.values()].sort((a, b) => b.xp - a.xp || b.count - a.count);

  return { total, groups, entries, spent };
}

const AR_MONTH = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const AR_DOW = ["الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];

/** «الجمعة ٢٣ أكتوبر» */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${AR_DOW[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTH[d.getUTCMonth()]}`;
}
