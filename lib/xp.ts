import "server-only";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export type Rank = {
  id: number;
  level: number;
  name: string;
  xp_required: number;
  reward_text: string | null;
  tier: string;
};

export type ActivityRule = {
  code: string;
  name_ar: string;
  xp: number;
  category: string;
  is_verified: boolean;
  is_active: boolean;
  sort_order: number;
};

export type Season = {
  id: number;
  name: string;
  starts_on: string;
  ends_on: string;
};

export type XpSource = "attendance" | "qr" | "self" | "teacher" | "quiz" | "admin";

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, starts_on, ends_on")
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getRanks(): Promise<Rank[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ranks")
    .select("id, level, name, xp_required, reward_text, tier")
    .order("level");
  return data ?? [];
}

export async function getRules(): Promise<ActivityRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_rules")
    .select("code, name_ar, xp, category, is_verified, is_active, sort_order")
    .order("sort_order");
  return data ?? [];
}

/** الرتبة الحالية والجاية وشريط التقدم */
export function rankFor(totalXp: number, ranks: Rank[]) {
  const sorted = [...ranks].sort((a, b) => a.xp_required - b.xp_required);
  let current = sorted[0] ?? null;
  for (const r of sorted) if (totalXp >= r.xp_required) current = r;

  const next = sorted.find((r) => r.xp_required > totalXp) ?? null;
  const base = current?.xp_required ?? 0;
  const span = next ? next.xp_required - base : 0;
  const progress = next && span > 0
    ? Math.min(100, Math.max(0, Math.round(((totalXp - base) / span) * 100)))
    : 100;

  return {
    current,
    next,
    progress,
    toNext: next ? Math.max(0, next.xp_required - totalXp) : 0,
  };
}

/**
 * بيضيف نقاط مرة واحدة بس. dedupe_key هو الضمان:
 * لو الحدث اتسجّل قبل كده، مفيش صف جديد ومفيش نقاط مكررة.
 * بيرجّع awarded=false لو كان متسجّل خلاص.
 */
export async function award(opts: {
  studentId: number;
  ruleCode: string;
  source: XpSource;
  dedupeKey: string;
  occurredOn: string;
  note?: string;
  createdBy?: string;
  xpOverride?: number;
}): Promise<{ awarded: boolean; xp: number; reason?: string }> {
  const supabase = await createClient();

  const [season, { data: rule }] = await Promise.all([
    getActiveSeason(),
    supabase
      .from("activity_rules")
      .select("code, xp, is_verified, is_active")
      .eq("code", opts.ruleCode)
      .maybeSingle(),
  ]);

  if (!season) return { awarded: false, xp: 0, reason: "مفيش موسم نشط" };
  if (!rule) return { awarded: false, xp: 0, reason: "النشاط ده مش معرّف" };
  if (!rule.is_active) return { awarded: false, xp: 0, reason: "النشاط ده موقوف" };

  if (opts.occurredOn < season.starts_on || opts.occurredOn > season.ends_on) {
    return { awarded: false, xp: 0, reason: "التاريخ خارج الموسم الحالي" };
  }

  const xp = opts.xpOverride ?? rule.xp;

  const { data, error } = await supabase
    .from("xp_ledger")
    .insert({
      student_id: opts.studentId,
      season_id: season.id,
      rule_code: rule.code,
      xp,
      is_verified: rule.is_verified,
      source: opts.source,
      dedupe_key: opts.dedupeKey,
      occurred_on: opts.occurredOn,
      note: opts.note ?? null,
      created_by: opts.createdBy ?? null,
    })
    .select("id")
    .maybeSingle();

  // 23505 = تعارض مع dedupe_key، يعني الحدث متسجّل قبل كده
  if (error) {
    if (error.code === "23505") {
      return { awarded: false, xp: 0, reason: "مسجّل قبل كده" };
    }
    throw new Error(error.message);
  }

  return { awarded: Boolean(data), xp };
}

/** قيد عكسي موثّق — مبنمسحش الأصل */
export async function reverse(opts: {
  dedupeKey: string;
  reason: string;
  createdBy: string;
}): Promise<{ reversed: boolean }> {
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("xp_ledger")
    .select("student_id, season_id, rule_code, xp, is_verified, occurred_on")
    .eq("dedupe_key", opts.dedupeKey)
    .maybeSingle();

  if (!original) return { reversed: false };

  const { error } = await supabase.from("xp_ledger").insert({
    student_id: original.student_id,
    season_id: original.season_id,
    rule_code: original.rule_code,
    xp: -original.xp,
    is_verified: original.is_verified,
    source: "admin",
    dedupe_key: `rev:${opts.dedupeKey}`,
    occurred_on: original.occurred_on,
    note: `قيد عكسي: ${opts.reason}`,
    created_by: opts.createdBy,
  });

  if (error && error.code !== "23505") throw new Error(error.message);
  return { reversed: !error };
}

export type StudentXp = {
  id: number;
  full_name: string;
  area: string | null;
  stage: string | null;
  total_xp: number;
  verified_xp: number;
};

export async function getLeaderboard(): Promise<StudentXp[]> {
  const season = await getActiveSeason();
  if (!season) return [];

  const supabase = await createClient();

  const [{ data: students }, { data: ledger }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, classes(area, stage)")
      .eq("is_active", true),
    supabase
      .from("xp_ledger")
      .select("student_id, xp, is_verified")
      .eq("season_id", season.id),
  ]);

  const totals = new Map<number, { total: number; verified: number }>();
  for (const row of ledger ?? []) {
    const t = totals.get(row.student_id) ?? { total: 0, verified: 0 };
    t.total += row.xp;
    if (row.is_verified) t.verified += row.xp;
    totals.set(row.student_id, t);
  }

  return (students ?? [])
    .map((s) => {
      const cls = s.classes as unknown as { area: string; stage: string } | null;
      const t = totals.get(s.id);
      return {
        id: s.id,
        full_name: s.full_name,
        area: cls?.area ?? null,
        stage: cls?.stage ?? null,
        total_xp: t?.total ?? 0,
        verified_xp: t?.verified ?? 0,
      };
    })
    // ترتيب واحد في كل السيستم: إجمالي النقط (والليفل بيتحسب منه)
    .sort((a, b) => b.total_xp - a.total_xp || a.full_name.localeCompare(b.full_name, "ar"));
}
