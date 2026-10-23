"use server";

import { revalidatePath } from "next/cache";
import { itemOf } from "@/lib/prizes";
import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero, heroLogin, heroLogout } from "@/lib/student-auth";
import { touchStreak } from "@/lib/streak";
import { award, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { todayISO } from "@/lib/types";
import { missionWindow, OPEN_HOUR, savePrefs, shiftDate } from "@/lib/habits";
import { gameFor } from "@/lib/games";
import { inviteState, settleFor, submitInvite as submitInviteCore } from "@/lib/referral";
import { checkAnswer } from "@/lib/games/build";

export async function loginAction(_prev: unknown, formData: FormData) {
  const res = await heroLogin(String(formData.get("code") ?? ""));
  if (!res.ok) return { error: res.error ?? "مش عارفين ندخّلك" };

  // بيرجّعه للصفحة اللي كان رايحها (صندوق الحظ مثلاً) — مسارات داخلية بس
  const next = String(formData.get("next") ?? "");
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/hero";

  revalidatePath("/hero", "layout");
  redirect(safe);
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

  // أول مهمة للولد الجديد بتعتمد دعوة اللي علّمه وتنزّله نقطه
  await settleFor(studentId);

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

/**
 * الولد بيشتري هدية من المحل.
 *
 * السعر بيتخصم من نقطه على طول، ومستواه بينزل معاه — فالشراء
 * قرار حقيقي مش زرار. والخصم والطلب بيتعملوا في معاملة واحدة
 * جوّه الداتابيز مع قفل على الولد، فمفيش شراء حاجتين بنفس
 * النقط.
 */
export async function claimReward(key: number) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  const item = itemOf(Number(key));
  if (!item) return { ok: false as const, error: "الهدية دي مش موجودة" };

  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!season) return { ok: false as const, error: "مفيش موسم نشط" };

  const { data, error } = await supabase.rpc("claim_prize", {
    p_student: hero.studentId,
    p_season: season.id,
    p_level: item.key,
    p_cost: item.cost,
    p_label: item.label,
  });

  if (error) {
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      return { ok: false as const, error: "خدت الهدية دي قبل كده" };
    }
    return { ok: false as const, error: error.message };
  }

  const row = (data ?? [])[0] as { balance: number } | undefined;

  revalidatePath("/hero", "layout");
  return { ok: true as const, balance: row?.balance ?? 0, cost: item.cost };
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

/** الولد الجديد بيكتب كود اللي علّمه اللعبة */
export async function submitInvite(code: string) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول" };

  const res = await submitInviteCore(hero.studentId, String(code ?? "").slice(0, 12));
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath("/hero", "layout");
  return { ok: true as const, inviterName: res.inviterName };
}

/** حالة الدعوة للولد الحالي */
export async function myInviteState() {
  const hero = await currentHero();
  if (!hero) return null;
  return inviteState(hero.studentId);
}
