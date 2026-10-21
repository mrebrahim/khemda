import "server-only";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { award, reverse } from "@/lib/xp";
import { todayISO } from "@/lib/types";

/**
 * «مين علّمك اللعبة؟»
 *
 * الولد الجديد بيكتب كود اللي علّمه، واللي علّمه بياخد نقط — بس
 * مش على طول: النقط بتنزل لما الولد الجديد يعمل أول مهمة فعلاً،
 * عشان الكود ما يتكتبش وخلاص.
 */

/** الحسابات اللي أول دخول ليها قبل التاريخ ده مش بتتحسب جديدة */
export const LAUNCH = "2026-10-21";

export type ReferralRow = {
  id: number;
  inviter_id: number;
  invitee_id: number;
  code_used: string;
  status: "pending" | "approved" | "rejected";
  xp_granted: boolean;
  created_at: string;
};

export type InviteState =
  | { state: "can-invite" }
  | { state: "done"; inviterName: string; status: ReferralRow["status"] }
  | { state: "not-new" };

/** أول يوم دخل فيه الولد — من سجل الدخول، أو آخر دخول لو السجل فاضي */
async function firstSeen(studentId: number): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_logins")
    .select("on_date")
    .eq("student_id", studentId)
    .order("on_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data?.on_date) return data.on_date as string;

  const { data: acc } = await supabase
    .from("student_accounts")
    .select("last_login_at")
    .eq("student_id", studentId)
    .maybeSingle();
  return acc?.last_login_at ? String(acc.last_login_at).slice(0, 10) : null;
}

/** الولد ده ينفع يكتب كود دعوة دلوقتي؟ */
export async function inviteState(studentId: number): Promise<InviteState> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("referrals")
    .select("id, inviter_id, status")
    .eq("invitee_id", studentId)
    .maybeSingle();

  if (existing) {
    const { data: inviter } = await supabase
      .from("students")
      .select("full_name")
      .eq("id", existing.inviter_id)
      .maybeSingle();
    return {
      state: "done",
      inviterName: inviter?.full_name ?? "صاحبك",
      status: existing.status as ReferralRow["status"],
    };
  }

  // الحسابات القديمة مش بتتحسب جديدة
  const seen = await firstSeen(studentId);
  if (seen && seen < LAUNCH) return { state: "not-new" };

  return { state: "can-invite" };
}

export type SubmitResult = { ok: true; inviterName: string } | { ok: false; error: string };

/** الولد الجديد بيكتب كود اللي علّمه */
export async function submitInvite(
  inviteeId: number,
  rawCode: string,
): Promise<SubmitResult> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return { ok: false, error: "الكود مش مظبوط" };
  }

  const state = await inviteState(inviteeId);
  if (state.state === "done") {
    return { ok: false, error: "كتبت كود قبل كده — الدعوة مرة واحدة بس" };
  }
  if (state.state === "not-new") {
    return { ok: false, error: "الدعوة للحسابات الجديدة بس" };
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("student_accounts")
    .select("student_id, is_active, is_demo, students!inner(is_active, full_name)")
    .eq("login_code", code)
    .maybeSingle();

  const student = Array.isArray(account?.students) ? account.students[0] : account?.students;
  const live = (student as { is_active?: boolean } | undefined)?.is_active === true;

  if (!account || !account.is_active || account.is_demo || !live) {
    return { ok: false, error: "الكود ده مش موجود — اتأكد منه تاني" };
  }
  if (account.student_id === inviteeId) {
    return { ok: false, error: "مينفعش تكتب كودك إنت 😄" };
  }

  const { error } = await supabase.from("referrals").insert({
    inviter_id: account.student_id,
    invitee_id: inviteeId,
    code_used: code,
  });

  if (error) {
    // القيد الفريد على invitee_id هو اللي بيمنع التكرار فعليًا
    if (error.code === "23505") {
      return { ok: false, error: "كتبت كود قبل كده — الدعوة مرة واحدة بس" };
    }
    return { ok: false, error: "حصلت مشكلة، جرّب تاني" };
  }

  // لو الولد الجديد خلّص مهمة خلاص، النقط تنزل على طول
  await settleFor(inviteeId);

  const name = (student as { full_name?: string } | undefined)?.full_name ?? "صاحبك";
  return { ok: true, inviterName: name };
}

/** الولد الجديد عمل أي مهمة؟ ده شرط نزول النقط */
async function hasStarted(studentId: number): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("daily_missions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);
  return (count ?? 0) > 0;
}

/**
 * بيعتمد دعوة الولد الجديد لو خلّص أول مهمة، وبينزّل النقط لصاحبها.
 * المفتاح مربوط برقم الدعوة، فمهما اتنادت الدالة النقط بتتحسب مرة.
 */
export async function settleFor(inviteeId: number): Promise<boolean> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("referrals")
    .select("id, inviter_id, invitee_id, status, xp_granted")
    .eq("invitee_id", inviteeId)
    .maybeSingle();

  if (!row || row.status !== "pending") return false;
  if (!(await hasStarted(inviteeId))) return false;

  const res = await award({
    studentId: row.inviter_id,
    ruleCode: "referral",
    source: "self",
    dedupeKey: `ref:${row.id}`,
    occurredOn: todayISO(),
    note: "علّم صاحبه اللعبة",
    createdBy: `student:${row.invitee_id}`,
  });

  await supabase
    .from("referrals")
    .update({
      status: "approved",
      xp_granted: res.awarded || row.xp_granted,
      decided_at: new Date().toISOString(),
      decided_by: "auto",
    })
    .eq("id", row.id);

  return true;
}

/** بيمرّ على كل الدعوات المعلّقة — بيتنادى من صفحة المشرف */
export async function settleAll(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("invitee_id")
    .eq("status", "pending");

  let n = 0;
  for (const r of data ?? []) {
    if (await settleFor(r.invitee_id)) n++;
  }
  return n;
}

/** المشرف بيرفض دعوة مشبوهة — والنقط بترجع بقيد عكسي */
export async function rejectReferral(
  id: number,
  by: string,
  reason: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("referrals")
    .select("id, xp_granted")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;

  if (row.xp_granted) {
    await reverse({ dedupeKey: `ref:${row.id}`, reason, createdBy: by });
  }

  await supabase
    .from("referrals")
    .update({
      status: "rejected",
      xp_granted: false,
      decided_at: new Date().toISOString(),
      decided_by: by,
      note: reason.slice(0, 200),
    })
    .eq("id", id);
}
