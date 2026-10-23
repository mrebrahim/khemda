import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * سحب آخر الموسم.
 *
 * الجوايز الكبيرة بتروح لأعلى ٣ بس — يعني باقي الولاد عارفين من
 * نص الموسم إنهم مش هياخدوا حاجة. السحب ده بيقلب الرسالة من
 * «اتنافس على المركز الأول» لـ«كمّل وإنت داخل السحب»، فبتوصل
 * لكل اللي بيلعبوا مش للتلاتة.
 */

export type SeasonDraw = {
  id: number;
  season_id: number;
  title: string;
  min_xp: number;
  exclude_top: number;
  prizes: string[];
  status: "open" | "drawn";
  eligible_count: number | null;
  drawn_by: string | null;
  drawn_at: string | null;
};

export type DrawWinner = {
  student_id: number;
  full_name: string;
  prize_label: string;
  slot: number;
  season_xp: number;
  delivered: boolean;
};

export async function listDraws(): Promise<(SeasonDraw & { season_name: string })[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("season_draws")
    .select(
      "id, season_id, title, min_xp, exclude_top, prizes, status, eligible_count, drawn_by, drawn_at, seasons(name)",
    )
    .order("id", { ascending: false });

  return (data ?? []).map((d) => {
    const s = d.seasons as { name: string } | { name: string }[] | null;
    const name = Array.isArray(s) ? (s[0]?.name ?? "") : (s?.name ?? "");
    return { ...(d as unknown as SeasonDraw), season_name: name };
  });
}

export async function winnersOf(drawId: number): Promise<DrawWinner[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("season_draw_winners")
    .select("student_id, prize_label, slot, season_xp, delivered, students(full_name)")
    .eq("draw_id", drawId)
    .order("slot");

  return (data ?? []).map((w) => {
    const s = w.students as { full_name: string } | { full_name: string }[] | null;
    return {
      student_id: w.student_id,
      full_name: Array.isArray(s) ? (s[0]?.full_name ?? "—") : (s?.full_name ?? "—"),
      prize_label: w.prize_label,
      slot: w.slot,
      season_xp: w.season_xp,
      delivered: w.delivered,
    };
  });
}

/** كام ولد مستوفي الشرط دلوقتي — بيتعرض قبل السحب */
export async function eligibleNow(
  seasonId: number,
  minXp: number,
  excludeTop: number,
): Promise<{ eligible: number; playing: number }> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("xp_ledger")
    .select("student_id, xp")
    .eq("season_id", seasonId);

  const totals = new Map<number, number>();
  for (const r of data ?? []) {
    totals.set(r.student_id, (totals.get(r.student_id) ?? 0) + r.xp);
  }

  const sorted = [...totals.values()].sort((a, b) => b - a);
  const eligible = sorted.slice(excludeTop).filter((xp) => xp >= minXp).length;
  return { eligible, playing: sorted.filter((xp) => xp > 0).length };
}

export type DrawStanding = {
  /** داخل السحب خلاص؟ */
  in: boolean;
  /** فاضله كام نقطة يدخل */
  need: number;
  minXp: number;
  title: string;
};

/** حالة الولد من سحب الموسم — بتتعرض في صفحته */
export async function drawStandingFor(
  studentId: number,
  seasonId: number,
  totalXp: number,
): Promise<DrawStanding | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("season_draws")
    .select("title, min_xp")
    .eq("season_id", seasonId)
    .eq("status", "open")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  void studentId;
  return {
    in: totalXp >= data.min_xp,
    need: Math.max(0, data.min_xp - totalXp),
    minXp: data.min_xp,
    title: data.title,
  };
}
