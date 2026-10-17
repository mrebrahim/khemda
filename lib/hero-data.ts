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
  /** نافذة المهمات: بتفتح ٧ الصبح وبتقفل نص الليل */
  window: MissionWindow;
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

  const { data: xpRows } = season
    ? await supabase
        .from("xp_ledger")
        .select("xp, is_verified")
        .eq("student_id", hero.studentId)
        .eq("season_id", season.id)
    : { data: [] };

  const totalXp = (xpRows ?? []).reduce((n, r) => n + r.xp, 0);
  const verifiedXp = (xpRows ?? [])
    .filter((r) => r.is_verified)
    .reduce((n, r) => n + r.xp, 0);

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
  };
}
