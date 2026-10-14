import "server-only";
import { createClient } from "@/lib/supabase/server";
import { award } from "@/lib/xp";
import { todayISO } from "@/lib/types";

/** مكافآت الوصول لسلسلة معينة */
const MILESTONES: { days: number; code: string }[] = [
  { days: 3, code: "streak_3" },
  { days: 7, code: "streak_7" },
  { days: 14, code: "streak_14" },
  { days: 30, code: "streak_30" },
  { days: 60, code: "streak_60" },
];

export type Streak = {
  current_streak: number;
  longest_streak: number;
  last_active_on: string | null;
  freezes_available: number;
};

const EMPTY: Streak = {
  current_streak: 0,
  longest_streak: 0,
  last_active_on: null,
  freezes_available: 2,
};

function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export async function getStreak(studentId: number): Promise<Streak> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_streaks")
    .select("current_streak, longest_streak, last_active_on, freezes_available")
    .eq("student_id", studentId)
    .maybeSingle();
  return data ?? EMPTY;
}

/**
 * بيحدّث السلسلة بعد ما الطالب يخلّص مهمة في يوم.
 * - نفس اليوم مرة تانية: مفيش تغيير
 * - اليوم اللي بعده على طول: السلسلة بتزيد
 * - فاته يوم واحد ومعاه تجميد: بيتصرف تجميد والسلسلة بتكمّل
 * - فاته أكتر من كده: السلسلة بتبدأ من ١
 */
export async function touchStreak(
  studentId: number,
  onDate: string = todayISO(),
): Promise<{ streak: Streak; grew: boolean; usedFreeze: boolean; milestone: number | null }> {
  const supabase = await createClient();
  const prev = await getStreak(studentId);

  let current = prev.current_streak;
  let freezes = prev.freezes_available;
  let grew = false;
  let usedFreeze = false;

  if (!prev.last_active_on) {
    current = 1;
    grew = true;
  } else {
    const gap = daysBetween(prev.last_active_on, onDate);
    if (gap <= 0) {
      // اليوم ده متسجّل خلاص
    } else if (gap === 1) {
      current += 1;
      grew = true;
    } else if (gap === 2 && freezes > 0) {
      // فاته يوم واحد بس — نصرف تجميد ونكمّل
      freezes -= 1;
      current += 1;
      grew = true;
      usedFreeze = true;
    } else {
      current = 1;
      grew = true;
    }
  }

  const longest = Math.max(prev.longest_streak, current);

  const { error } = await supabase.from("student_streaks").upsert(
    {
      student_id: studentId,
      current_streak: current,
      longest_streak: longest,
      last_active_on: onDate > (prev.last_active_on ?? "") ? onDate : prev.last_active_on,
      freezes_available: freezes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" },
  );
  if (error) throw new Error(error.message);

  // مكافأة الوصول لعلامة جديدة — مرة واحدة لكل علامة في الموسم
  let milestone: number | null = null;
  if (grew) {
    const hit = MILESTONES.find((m) => m.days === current);
    if (hit) {
      const res = await award({
        studentId,
        ruleCode: hit.code,
        source: "self",
        dedupeKey: `streak:${studentId}:${hit.code}`,
        occurredOn: onDate,
        note: `وصل لسلسلة ${hit.days} يوم`,
        createdBy: "system:streak",
      });
      if (res.awarded) milestone = hit.days;
    }
  }

  return {
    streak: { current_streak: current, longest_streak: longest, last_active_on: onDate, freezes_available: freezes },
    grew,
    usedFreeze,
    milestone,
  };
}

/** هل السلسلة في خطر؟ (عمل أمبارح ولسه ماعملش النهارده) */
export function streakAtRisk(streak: Streak, today: string = todayISO()): boolean {
  if (!streak.last_active_on || streak.current_streak === 0) return false;
  return daysBetween(streak.last_active_on, today) === 1;
}

export { MILESTONES };
