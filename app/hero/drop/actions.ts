"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentHero } from "@/lib/student-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getEvent,
  makeSolved,
  openBox,
  readPass,
  readSolved,
  PASS_COOKIE,
  type LuckyAttempt,
} from "@/lib/lucky";
import {
  checkAnswer,
  missionOf,
  pickMissions,
  pickQuestion,
  type PublicQuestion,
} from "@/lib/lucky-missions";

export type DropResult =
  | { ok: true; label: string; kind: string; xp: number; taayo: number; attemptId: number }
  | { ok: false; error: string };

/** فتح الصندوق. التصريح في الكوكي هو إثبات إنه مسح الكود فعلاً. */
export async function openDrop(idempotencyKey: string, solved: string): Promise<DropResult> {
  const hero = await currentHero();
  if (!hero) return { ok: false, error: "لازم تسجّل دخول الأول" };

  // التحدي اتحلّ فعلاً؟ التصريح موقّع على السيرفر، فمفيش فتح
  // من غير إجابة صح
  if (!readSolved(solved, hero.studentId)) {
    return { ok: false, error: "جاوب على التحدي الأول" };
  }

  const jar = await cookies();
  const eventId = readPass(jar.get(PASS_COOKIE)?.value);
  if (!eventId) {
    return { ok: false, error: "امسح الكود من عند الخادم تاني" };
  }

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "الحدث ده مش موجود" };

  const key = String(idempotencyKey).slice(0, 80);
  if (key.length < 8) return { ok: false, error: "طلب مش مظبوط" };

  const res = await openBox({ event, studentId: hero.studentId, idempotencyKey: key });
  if (!res.ok) return { ok: false, error: res.error };

  const a: LuckyAttempt = res.attempt;
  revalidatePath("/hero", "layout");
  return {
    ok: true,
    label: a.prize_label ?? "مكافأة",
    kind: a.prize_kind ?? "xp",
    xp: a.prize_xp,
    taayo: a.prize_taayo,
    attemptId: a.id,
  };
}

/* ── التحدي اللي قبل الصندوق ────────────────────────────── */

/**
 * سؤال جديد. الإجابة الصح مابتنزلش للمتصفح خالص — بنبعت
 * الاختيارات بس، والتصحيح بيحصل على السيرفر.
 */
export async function nextQuestion(seen: string[] = []): Promise<PublicQuestion | null> {
  const hero = await currentHero();
  if (!hero) return null;
  return pickQuestion(Array.isArray(seen) ? seen.slice(0, 40).map(String) : []);
}

export type AnswerResult =
  | { ok: true; note?: string; pass: string }
  | { ok: false };

/**
 * تصحيح الإجابة. لو صح بنرجّع تصريح موقّع، وده اللي بيتبعت مع
 * فتح الصندوق — فمحدش يقدر يفتح من غير ما يعدّي التحدي.
 */
export async function answerQuestion(key: string, choice: number): Promise<AnswerResult> {
  const hero = await currentHero();
  if (!hero) return { ok: false };

  const res = checkAnswer(String(key), Number(choice));
  if (!res.ok) return { ok: false };

  const pass = makeSolved(hero.studentId);
  if (!pass) return { ok: false };
  return { ok: true, note: res.note, pass };
}

/* ── مهمة البيت ─────────────────────────────────────────── */

export type MissionOffer = {
  missions: { key: string; icon: string; label: string; how: string; bonusXp: number }[];
  chosen: { label: string; status: string; bonusXp: number } | null;
};

/** المهمات المعروضة على الولد، أو اللي اختارها خلاص */
export async function missionOffer(): Promise<MissionOffer | null> {
  const hero = await currentHero();
  if (!hero) return null;

  const jar = await cookies();
  const eventId = readPass(jar.get(PASS_COOKIE)?.value);
  if (!eventId) return null;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("lucky_home_missions")
    .select("mission_label, status, bonus_xp")
    .eq("event_id", eventId)
    .eq("student_id", hero.studentId)
    .maybeSingle();

  if (data) {
    return {
      missions: [],
      chosen: { label: data.mission_label, status: data.status, bonusXp: data.bonus_xp },
    };
  }

  return { missions: pickMissions(3), chosen: null };
}

/** الولد بيختار مهمته. البونص بيفضل مستنّي لحد ما الخادم يتأكد. */
export async function chooseMission(missionKey: string) {
  const hero = await currentHero();
  if (!hero) return { ok: false as const, error: "لازم تسجّل دخول الأول" };

  const jar = await cookies();
  const eventId = readPass(jar.get(PASS_COOKIE)?.value);
  if (!eventId) return { ok: false as const, error: "امسح الكود من عند الخادم تاني" };

  const mission = missionOf(String(missionKey));
  if (!mission) return { ok: false as const, error: "المهمة دي مش موجودة" };

  const supabase = await createAdminClient();
  const { error } = await supabase.from("lucky_home_missions").insert({
    event_id: eventId,
    student_id: hero.studentId,
    mission_key: mission.key,
    mission_label: mission.label,
    bonus_xp: mission.bonusXp,
  });

  // 23505 = اختار مهمة قبل كده، وده مش خطأ
  if (error && error.code !== "23505") {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/hero", "layout");
  return { ok: true as const, label: mission.label, bonusXp: mission.bonusXp };
}
