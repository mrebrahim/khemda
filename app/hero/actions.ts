"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero, heroLogin, heroLogout } from "@/lib/student-auth";
import { touchStreak } from "@/lib/streak";
import { award, getRanks, getActiveSeason, rankFor } from "@/lib/xp";
import { todayISO } from "@/lib/types";

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

  const today = todayISO();
  const supabase = await createClient();

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
