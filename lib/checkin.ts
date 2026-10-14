import "server-only";
import { createClient } from "@/lib/supabase/server";
import { award, getRanks, rankFor, getActiveSeason } from "@/lib/xp";
import { todayISO } from "@/lib/types";

export type ScanTarget = {
  studentId: number;
  fullName: string;
  area: string | null;
  stage: string | null;
  servants: string[];
  alreadyHere: boolean;
};

export type CheckInResult =
  | { status: "unknown" }
  | { status: "already"; name: string }
  | {
      status: "ok";
      name: string;
      xp: number;
      totalXp: number;
      rankName: string | null;
      rankedUp: boolean;
      toNext: number;
      nextRank: string | null;
    };

/** بيقرا التوكن ويرجّع بيانات الولد عشان الخادم يتأكد من هويته قبل التسجيل */
export async function lookupToken(token: string): Promise<ScanTarget | null> {
  const clean = token.trim().toLowerCase();
  if (!/^[a-f0-9]{16,64}$/.test(clean)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("qr_tokens")
    .select("student_id, is_active, students(full_name, class_id, is_active, classes(area, stage))")
    .eq("token", clean)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  const st = data.students as unknown as {
    full_name: string;
    class_id: number;
    is_active: boolean;
    classes: { area: string; stage: string } | null;
  } | null;
  if (!st || !st.is_active) return null;

  const [{ data: servants }, { data: session }] = await Promise.all([
    supabase
      .from("servants")
      .select("full_name")
      .eq("class_id", st.class_id)
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("sessions").select("id").eq("session_date", todayISO()).maybeSingle(),
  ]);

  let alreadyHere = false;
  if (session) {
    const { data: att } = await supabase
      .from("student_attendance")
      .select("service")
      .eq("session_id", session.id)
      .eq("student_id", data.student_id)
      .maybeSingle();
    alreadyHere = Boolean(att?.service);
  }

  return {
    studentId: data.student_id,
    fullName: st.full_name,
    area: st.classes?.area ?? null,
    stage: st.classes?.stage ?? null,
    servants: (servants ?? []).map((s) => s.full_name),
    alreadyHere,
  };
}

/**
 * بيسجّل حضور مدارس الأحد وبيضيف النقاط.
 * الحضور نفسه بيتسجّل في نفس جدول نظام الحضور، والنقاط بتتربط
 * بالجلسة فمستحيل تتحسب مرتين لنفس اليوم.
 */
export async function checkIn(
  token: string,
  byServant: string,
): Promise<CheckInResult> {
  const target = await lookupToken(token);
  if (!target) return { status: "unknown" };

  const today = todayISO();
  const supabase = await createClient();

  // الجلسة بتتعمل لو مش موجودة
  let sessionId: number;
  const existing = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", today)
    .maybeSingle();

  if (existing.data) {
    sessionId = existing.data.id;
  } else {
    const created = await supabase
      .from("sessions")
      .insert({ session_date: today })
      .select("id")
      .single();
    if (created.error) {
      const retry = await supabase
        .from("sessions")
        .select("id")
        .eq("session_date", today)
        .single();
      sessionId = retry.data!.id;
    } else {
      sessionId = created.data.id;
    }
  }

  const { error: attError } = await supabase.from("student_attendance").upsert(
    {
      session_id: sessionId,
      student_id: target.studentId,
      service: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" },
  );
  if (attError) throw new Error(attError.message);

  const ranks = await getRanks();
  const season = await getActiveSeason();

  // رصيده قبل الإضافة عشان نعرف هل اترقّى ولا لأ
  const before = season
    ? ((
        await supabase
          .from("xp_ledger")
          .select("xp")
          .eq("student_id", target.studentId)
          .eq("season_id", season.id)
      ).data ?? []).reduce((n, r) => n + r.xp, 0)
    : 0;

  const res = await award({
    studentId: target.studentId,
    ruleCode: "sunday_school",
    source: "qr",
    dedupeKey: `att:${sessionId}:${target.studentId}:sunday_school`,
    occurredOn: today,
    note: "تسجيل بالـQR",
    createdBy: byServant,
  });

  if (!res.awarded) {
    return { status: "already", name: target.fullName };
  }

  const after = before + res.xp;
  const rankBefore = rankFor(before, ranks).current;
  const rankAfter = rankFor(after, ranks);

  return {
    status: "ok",
    name: target.fullName,
    xp: res.xp,
    totalXp: after,
    rankName: rankAfter.current?.name ?? null,
    rankedUp: (rankAfter.current?.level ?? 0) > (rankBefore?.level ?? 0),
    toNext: rankAfter.toNext,
    nextRank: rankAfter.next?.name ?? null,
  };
}
