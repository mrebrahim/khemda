"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero, heroLogin, heroLogout } from "@/lib/student-auth";
import { touchStreak } from "@/lib/streak";
import { award, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { todayISO } from "@/lib/types";
import { missionWindow, OPEN_HOUR, savePrefs, shiftDate } from "@/lib/habits";

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
  const supabase = await createClient();

  // مهمة الكتاب بتفتح بعد ما يخلّص الصلاة
  if (ruleCode === "bible") {
    const { data: prayerDone } = await supabase
      .from("daily_missions")
      .select("rule_code")
      .eq("student_id", hero.studentId)
      .eq("on_date", today)
      .eq("rule_code", "prayer")
      .maybeSingle();

    if (!prayerDone) {
      return {
        ok: false as const,
        error: "خلّص مهمة الصلاة الأول عشان دي تفتح",
      };
    }
  }

  // القيد الفريد (student, rule, date) هو اللي بيمنع التكرار فعليًا
  const { error } = await supabase.from("daily_missions").insert({
    student_id: hero.studentId,
    rule_code: ruleCode,
    on_date: today,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "عملتها النهارده خلاص يا بطل" };
    }
    throw new Error(error.message);
  }

  // رصيده قبل الإضافة عشان نعرف هل اترقّى
  const ranks = await getRanks();
  const season = await getActiveSeason();
  const before = season
    ? ((
        await supabase
          .from("xp_ledger")
          .select("xp")
          .eq("student_id", hero.studentId)
          .eq("season_id", season.id)
      ).data ?? []).reduce((n, r) => n + r.xp, 0)
    : 0;

  const res = await award({
    studentId: hero.studentId,
    ruleCode,
    source: "self",
    dedupeKey: `daily:${hero.studentId}:${ruleCode}:${today}`,
    occurredOn: today,
    createdBy: `student:${hero.studentId}`,
  });

  const streak = await touchStreak(hero.studentId, today);

  // مكافأة السلسلة بتتضاف جوه touchStreak، فبنعيد الحساب بعدها
  const after = season
    ? ((
        await supabase
          .from("xp_ledger")
          .select("xp")
          .eq("student_id", hero.studentId)
          .eq("season_id", season.id)
      ).data ?? []).reduce((n, r) => n + r.xp, 0)
    : before + res.xp;

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
