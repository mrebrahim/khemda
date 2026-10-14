"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentHero, heroLogin, heroLogout } from "@/lib/student-auth";
import { touchStreak } from "@/lib/streak";
import { award } from "@/lib/xp";
import { todayISO } from "@/lib/types";

export async function loginAction(_prev: unknown, formData: FormData) {
  const res = await heroLogin(
    String(formData.get("code") ?? ""),
    String(formData.get("pin") ?? ""),
  );
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

  const res = await award({
    studentId: hero.studentId,
    ruleCode,
    source: "self",
    dedupeKey: `daily:${hero.studentId}:${ruleCode}:${today}`,
    occurredOn: today,
    createdBy: `student:${hero.studentId}`,
  });

  const streak = await touchStreak(hero.studentId, today);

  revalidatePath("/hero");
  return {
    ok: true as const,
    xp: res.xp,
    streak: streak.streak.current_streak,
    milestone: streak.milestone,
    usedFreeze: streak.usedFreeze,
  };
}
