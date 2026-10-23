import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentHero, isConfigured, type HeroSession } from "@/lib/student-auth";
import { hasServiceRole } from "@/lib/supabase/admin";
import { getRanks, rankFor, getActiveSeason, getRules, type Rank, type ActivityRule } from "@/lib/xp";
import { getStreak, streakAtRisk, type Streak } from "@/lib/streak";
import {
  cairoHour,
  getPrefs,
  missionWindow,
  weekOf,
  type DayCell,
  type MissionWindow,
  type ReminderPrefs,
} from "@/lib/habits";
import { daysLeft, type SeasonRace } from "@/lib/board";
import { drawStandingFor, type DrawStanding } from "@/lib/draws";
import { badgesFor, type EarnedBadge } from "@/lib/badges";
import { todayISO } from "@/lib/types";

export type HeroState = {
  hero: HeroSession;
  totalXp: number;
  verifiedXp: number;
  ranks: Rank[];
  rules: ActivityRule[];
  rank: ReturnType<typeof rankFor>;
  streak: Streak;
  atRisk: boolean;
  doneToday: Set<string>;
  seasonId: number | null;
  /** آخر ٧ أيام — تقويم العادة */
  week: DayCell[];
  prefs: ReminderPrefs;
  /** الساعة بتوقيت مصر — عشان بانر «آخر فرصة» */
  hour: number;
  /** نافذة المهمات: بتفتح ٧ بالليل وبتقفل نص الليل */
  window: MissionWindow;
  /** سباق الموسم: فاضل كام يوم، ومركزه، والفرق عن اللي قبله */
  race: SeasonRace | null;
  /** سحب آخر الموسم: داخل ولا فاضله كام نقطة */
  draw: DrawStanding | null;
  /** الشارات — محسوبة من اللي عمله، مش متسجّلة */
  badges: EarnedBadge[];
};

export function missingConfig(): string[] {
  const m: string[] = [];
  if (!isConfigured()) m.push("STUDENT_SESSION_SECRET");
  if (!hasServiceRole()) m.push("SUPABASE_SERVICE_ROLE_KEY");
  return m;
}

/** كل اللي صفحات الولد محتاجاه — بيتجاب مرة واحدة في الـlayout */
export async function loadHero(): Promise<HeroState | null> {
  const hero = await currentHero();
  if (!hero) return null;

  const today = todayISO();
  const supabase = await createAdminClient();

  const [season, ranks, rules, streak, week, prefs, { data: done }] = await Promise.all([
    getActiveSeason(),
    getRanks(),
    getRules(),
    getStreak(hero.studentId),
    weekOf(hero.studentId, today),
    getPrefs(hero.studentId),
    supabase
      .from("daily_missions")
      .select("rule_code")
      .eq("student_id", hero.studentId)
      .eq("on_date", today),
  ]);

  const [{ data: xpRows }, { data: deedRows }] = await Promise.all([
    season
      ? supabase
          .from("xp_ledger")
          .select("xp, is_verified")
          .eq("student_id", hero.studentId)
          .eq("season_id", season.id)
      : Promise.resolve({ data: [] as { xp: number; is_verified: boolean }[] }),
    // الشارات بتتحسب من السنة كلها، مش من الموسم — اللي عمله
    // مش بيتشال منه مع الموسم الجديد
    supabase.from("xp_ledger").select("rule_code").eq("student_id", hero.studentId),
  ]);

  const counts: Record<string, number> = {};
  for (const r of deedRows ?? []) {
    counts[r.rule_code] = (counts[r.rule_code] ?? 0) + 1;
  }

  const totalXp = (xpRows ?? []).reduce((n, r) => n + r.xp, 0);
  const verifiedXp = (xpRows ?? [])
    .filter((r) => r.is_verified)
    .reduce((n, r) => n + r.xp, 0);

  const [race, draw] = await Promise.all([
    season ? seasonRace(hero.studentId, season, today) : null,
    season ? drawStandingFor(hero.studentId, season.id, totalXp) : null,
  ]);

  return {
    hero,
    totalXp,
    verifiedXp,
    ranks,
    rules,
    rank: rankFor(totalXp, ranks),
    streak,
    atRisk: streakAtRisk(streak, today),
    doneToday: new Set((done ?? []).map((d) => d.rule_code)),
    seasonId: season?.id ?? null,
    week,
    prefs,
    hour: cairoHour(),
    window: missionWindow(),
    race,
    draw,
    badges: badgesFor(counts, streak.longest_streak),
  };
}

/**
 * مركز الولد في سباق الموسم.
 *
 * بنقرا من نفس الview اللي اللوحة بتقرا منه، فالترتيب اللي
 * بيشوفه هنا هو نفسه اللي على اللوحة بالظبط.
 */
async function seasonRace(
  studentId: number,
  season: { name: string; ends_on: string },
  today: string,
): Promise<SeasonRace | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("board_leaderboard")
    .select("id, total_xp, rank_level")
    .order("rank_level", { ascending: false })
    .order("total_xp", { ascending: false })
    .order("display_name", { ascending: true });

  const rows = data ?? [];
  const i = rows.findIndex((r) => r.id === studentId);

  return {
    seasonName: season.name,
    left: daysLeft(season.ends_on, today),
    place: i >= 0 ? i + 1 : rows.length + 1,
    total: rows.length,
    gapAbove: i > 0 ? rows[i - 1].total_xp - rows[i].total_xp : null,
    gapBelow: i >= 0 && i < rows.length - 1 ? rows[i].total_xp - rows[i + 1].total_xp : null,
  };
}
