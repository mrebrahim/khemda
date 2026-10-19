"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero, heroLogin, heroLogout } from "@/lib/student-auth";
import { touchStreak } from "@/lib/streak";
import { award, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { todayISO } from "@/lib/types";
import { missionWindow, OPEN_HOUR, savePrefs, shiftDate } from "@/lib/habits";
import { gameFor } from "@/lib/games";
import { checkAnswer } from "@/lib/games/build";

export async function loginAction(_prev: unknown, formData: FormData) {
  const res = await heroLogin(String(formData.get("code") ?? ""));
  if (!res.ok) return { error: res.error ?? "مش عارفين ندخّلك" };
  revalidatePath("/hero", "layout");
  redirect("/hero");
}

export async function logoutAction() {
  await heroLogout();
  revalidatePath("/hero", "layout");
  redirect("/hero/login");
}

/**
 * بيسجّل مهمة يومية وبيحسب النقط والسلسلة والترقية.
 * الفرق بين المهمات بيتحسم قبل ما نوصل هنا.
 */
async function recordDaily(studentId: number, ruleCode: string, today: string) {
  const supabase = await createClient();

  // القيد الفريد (student, rule, date) هو اللي بيمنع التكرار فعليًا
  const { error } = await supabase.from("daily_missions").insert({
    student_id: studentId,
    rule_code: ruleCode,
    on_date: today,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "عملتها النهارده خلاص يا بطل" };
    }
    throw new Error(error.message);
  }

  const ranks = await getRanks();
  const season = await getActiveSeason();
  const totalXp = async () =>
    season
      ? (
          (
            await supabase
              .from("xp_ledger")
              .select("xp")
              .eq("student_id", studentId)
              .eq("season_id", season.id)
          ).data ?? []
        ).reduce((n, r) => n + r.xp, 0)
      : 0;

  const before = await totalXp();

  const res = await award({
    studentId,
    ruleCode,
    source: "self",
    dedupeKey: `daily:${studentId}:${ruleCode}:${today}`,
    occurredOn: today,
    createdBy: `student:${studentId}`,
  });

  const streak = await touchStreak(studentId, today);

  // مكافأة السلسلة بتتضاف جوه touchStreak، فبنعيد الحساب بعدها
  const after = season ? await totalXp() : before + res.xp;

  const rankBefore = rankFor(before, ranks).current;
  const rankAfter = rankFor(after, ranks).current;
  const leveledUp = (rankAfter?.level ?? 0) > (rankBefore?.level ?? 0);

  revalidatePath("/hero", "layout");
  return {
    ok: true as const,
    xp: res.xp,
    totalXp: after,
    streak: streak.streak.current_streak,
    milestone: streak.milestone,
    usedFreeze: streak.usedFreeze,
    leveledUp,
    level: rankAfter?.level ?? 1,
    rankName: rankAfter?.name ?? "",
    reward: rankAfter?.reward_text ?? null,
  };
}

/** المهمات اللي الولد خلّصها النهارده */
async function doneCodes(studentId: number, today: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_missions")
    .select("rule_code")
    .eq("student_id", studentId)
    .eq("on_date", today);
  return new Set((data ?? []).map((d) => d.rule_code));
}

/** الطالب بيأكّد إنه عمل مهمة النهارده. مرة واحدة بس لكل مهمة في اليوم. */
export async function completeMission(ruleCode: "prayer" | "bible") {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  // المهمات بتفتح ٧ بالليل — قبل كده مش مسموح
  const win = missionWindow();
  if (!win.open) {
    return {
      ok: false as const,
      error: "المهمات بتفتح الساعة ٧ بالليل — استنى شوية",
    };
  }

  const today = todayISO();

  // مهمة الكتاب بتفتح بعد ما يخلّص الصلاة
  if (ruleCode === "bible") {
    const done = await doneCodes(hero.studentId, today);
    if (!done.has("prayer")) {
      return {
        ok: false as const,
        error: "خلّص مهمة الصلاة الأول عشان دي تفتح",
      };
    }
  }

  return recordDaily(hero.studentId, ruleCode, today);
}

/**
 * تحدي النهارده. اللعبة بتتحدد من التاريخ، والإجابة بتتصحّح هنا
 * على السيرفر — اللغز اللي راح للموبايل مفيهوش الحل أصلاً.
 */
export async function completeGame(answers: string[]) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  const win = missionWindow();
  if (!win.open) {
    return {
      ok: false as const,
      error: "المهمات بتفتح الساعة ٧ بالليل — استنى شوية",
    };
  }

  const today = todayISO();
  const done = await doneCodes(hero.studentId, today);
  if (!done.has("prayer") || !done.has("bible")) {
    return {
      ok: false as const,
      error: "خلّص الصلاة والإصحاح الأول وتحدي النهارده يفتح",
    };
  }

  const game = gameFor(today);
  const clean = Array.isArray(answers) ? answers.map((a) => String(a).slice(0, 80)) : [];
  if (!checkAnswer(game.key, today, clean)) {
    return { ok: false as const, error: "مش ظبطت — جرّب تاني" };
  }

  return recordDaily(hero.studentId, "game", today);
}

/** الولد بيطلب جايزة مستوى وصله. المشرف هو اللي بيوافق ويسلّم. */
export async function claimReward(level: number) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!season) return { ok: false as const, error: "مفيش موسم نشط" };

  // التحقق من الاستحقاق على السيرفر — مش بالاعتماد على الواجهة
  const [{ data: rank }, { data: xpRows }] = await Promise.all([
    supabase.from("ranks").select("level, xp_required").eq("level", level).maybeSingle(),
    supabase
      .from("xp_ledger")
      .select("xp")
      .eq("student_id", hero.studentId)
      .eq("season_id", season.id),
  ]);

  if (!rank) return { ok: false as const, error: "المستوى ده مش موجود" };

  const totalXp = (xpRows ?? []).reduce((n, r) => n + r.xp, 0);
  if (totalXp < rank.xp_required) {
    return { ok: false as const, error: "لسه موصلتش للمستوى ده" };
  }

  const { error } = await supabase.from("reward_claims").insert({
    student_id: hero.studentId,
    season_id: season.id,
    level,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "طلبت الجايزة دي قبل كده" };
    }
    throw new Error(error.message);
  }

  revalidatePath("/hero/rewards");
  return { ok: true as const };
}

/** الولد بيظبط تذكيره: يشتغل ولا لأ، الميعاد، هدفه اليومي */
export async function saveReminderPrefs(patch: {
  reminders_on?: boolean;
  slot?: "morning" | "night";
  daily_goal?: 1 | 2;
  pause_days?: number;
}) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  const clean: Record<string, unknown> = {};
  if (typeof patch.reminders_on === "boolean") clean.reminders_on = patch.reminders_on;
  if (patch.slot === "morning" || patch.slot === "night") clean.slot = patch.slot;
  if (patch.daily_goal === 1 || patch.daily_goal === 2) clean.daily_goal = patch.daily_goal;
  if (typeof patch.pause_days === "number") {
    // وقف التذكير لمدة محدودة بس — أقصاها أسبوع
    const days = Math.max(0, Math.min(7, Math.round(patch.pause_days)));
    clean.paused_until = days === 0 ? null : shiftDate(todayISO(), days);
  }

  await savePrefs(hero.studentId, clean as Parameters<typeof savePrefs>[1]);
  revalidatePath("/hero", "layout");
  return { ok: true as const };
}
