"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEvent, makeQrToken, secondsLeftInWindow, QR_SECONDS } from "@/lib/lucky";
import { getBaseUrl } from "@/lib/site";
import { qrDataUrl } from "@/lib/qr";
import { award } from "@/lib/xp";
import { todayISO } from "@/lib/types";

async function servant(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? (user.email ?? "servant") : null;
}

async function log(eventId: number | null, actor: string, action: string, meta?: unknown) {
  const supabase = await createAdminClient();
  await supabase.from("lucky_audit").insert({
    event_id: eventId,
    actor,
    action,
    meta: meta ? (meta as Record<string, unknown>) : null,
  });
}

/** مجموعة جوايز مبدئية — المشرف بيعدّلها زي ما هو عايز */
const PRESET = [
  { kind: "xp", label: "+٥ نقط", xp: 5, taayo: 0, weight: 35, stock: null },
  { kind: "xp", label: "+١٠ نقط", xp: 10, taayo: 0, weight: 25, stock: null },
  { kind: "xp", label: "+١٥ نقطة", xp: 15, taayo: 0, weight: 10, stock: null },
  { kind: "badge", label: "شارة نادرة", xp: 0, taayo: 0, weight: 3, stock: null },
  { kind: "taayo", label: "٢٠ طايو", xp: 0, taayo: 20, weight: 12, stock: 5 },
  { kind: "taayo", label: "٣٠ طايو", xp: 0, taayo: 30, weight: 8, stock: 3 },
  { kind: "taayo", label: "٥٠ طايو", xp: 0, taayo: 50, weight: 5, stock: 2 },
  { kind: "taayo", label: "١٠٠ طايو", xp: 0, taayo: 100, weight: 2, stock: 1 },
];

export async function createEvent(formData: FormData) {
  const by = await servant();
  if (!by) return;

  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) return;

  const requireAttendance = formData.get("require_attendance") === "on";
  const maxAttempts = Math.min(5, Math.max(1, Number(formData.get("max_attempts") ?? 1)));
  const minLevelRaw = Number(formData.get("min_level") ?? 0);
  const minLevel = Number.isInteger(minLevelRaw) && minLevelRaw > 0 ? minLevelRaw : null;

  const supabase = await createAdminClient();
  const { data: event, error } = await supabase
    .from("lucky_events")
    .insert({
      title,
      status: "draft",
      require_attendance: requireAttendance,
      max_attempts: maxAttempts,
      min_level: minLevel,
      created_by: by,
    })
    .select("id")
    .single();

  if (error || !event) return;

  await supabase.from("lucky_prizes").insert(
    PRESET.map((p, i) => ({
      event_id: event.id,
      kind: p.kind,
      label: p.label,
      xp: p.xp,
      taayo: p.taayo,
      weight: p.weight,
      total_stock: p.stock,
      remaining_stock: p.stock,
      sort_order: i,
    })),
  );

  await log(event.id, by, "create", { title });
  revalidatePath("/lucky");
}

export async function setStatus(eventId: number, status: string) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };
  if (!["draft", "active", "ended", "cancelled"].includes(status)) {
    return { ok: false as const, error: "حالة مش معروفة" };
  }

  const supabase = await createAdminClient();
  const patch: Record<string, unknown> = { status };
  // تفعيل الحدث بيجدّد الأكواد، فأي كود قديم بيبطل فورًا
  if (status === "active") {
    const { data } = await supabase
      .from("lucky_events")
      .select("qr_epoch")
      .eq("id", eventId)
      .maybeSingle();
    patch.qr_epoch = (data?.qr_epoch ?? 1) + 1;
    patch.starts_at = new Date().toISOString();
    // مهم: لو الحدث كان خلص قبل كده، ends_at القديم لازم يتشال —
    // غير كده الحدث يبقى «شغّال» والولد يلاقي «الحدث خلص»
    patch.ends_at = null;
  }
  if (status === "ended") patch.ends_at = new Date().toISOString();

  const { error } = await supabase.from("lucky_events").update(patch).eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };

  await log(eventId, by, `status:${status}`);
  revalidatePath(`/lucky/${eventId}`);
  revalidatePath("/lucky");
  return { ok: true as const };
}

/** تجديد الكود يدويًا — أي كود اتصوّر قبل كده بيبطل */
export async function rotateQr(eventId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("lucky_events")
    .select("qr_epoch")
    .eq("id", eventId)
    .maybeSingle();

  await supabase
    .from("lucky_events")
    .update({ qr_epoch: (data?.qr_epoch ?? 1) + 1 })
    .eq("id", eventId);

  await log(eventId, by, "rotate_qr");
  revalidatePath(`/lucky/${eventId}`);
  return { ok: true as const };
}

/** `window` = مدة الكود كلها بالثواني، عشان الشريط يرسم صح */
export type QrFrame = { image: string; seconds: number; window: number } | null;

/** الكود الحالي كصورة — الواجهة بتطلبه كل دقيقة */
export async function currentQr(eventId: number): Promise<QrFrame> {
  if (!(await servant())) return null;

  const event = await getEvent(eventId);
  if (!event || event.status !== "active") return null;

  const token = makeQrToken(event);
  if (!token) return null;

  const base = await getBaseUrl();
  const image = await qrDataUrl(`${base}/hero/drop/scan?t=${encodeURIComponent(token)}`, 420);
  return { image, seconds: secondsLeftInWindow(), window: QR_SECONDS };
}

export async function addPrize(eventId: number, formData: FormData) {
  const by = await servant();
  if (!by) return;

  const kind = String(formData.get("kind") ?? "xp");
  if (!["xp", "taayo", "badge"].includes(kind)) return;

  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  const weight = Math.max(1, Number(formData.get("weight") ?? 1));
  const value = Math.max(0, Number(formData.get("value") ?? 0));
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const stock = stockRaw === "" ? null : Math.max(0, Number(stockRaw));
  if (!label) return;

  const supabase = await createAdminClient();
  await supabase.from("lucky_prizes").insert({
    event_id: eventId,
    kind,
    label,
    xp: kind === "xp" ? value : 0,
    taayo: kind === "taayo" ? value : 0,
    weight,
    total_stock: stock,
    remaining_stock: stock,
    sort_order: 99,
  });

  await log(eventId, by, "prize_add", { label, weight });
  revalidatePath(`/lucky/${eventId}`);
}

export async function removePrize(eventId: number, prizeId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  await supabase.from("lucky_prizes").delete().eq("id", prizeId).eq("event_id", eventId);
  await log(eventId, by, "prize_remove", { prizeId });
  revalidatePath(`/lucky/${eventId}`);
  return { ok: true as const };
}

/** تأكيد تسليم جايزة الطايو — مرة واحدة بس */
export async function deliverClaim(claimId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("lucky_claims")
    .update({
      status: "delivered",
      delivered_by: by,
      delivered_at: new Date().toISOString(),
    })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id, event_id, student_id, label")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "الجايزة دي اتسلّمت قبل كده" };

  await log(data.event_id, by, "deliver", { claim: claimId, label: data.label });
  revalidatePath(`/lucky/${data.event_id}`);
  revalidatePath("/lucky");
  return { ok: true as const };
}

export async function cancelClaim(claimId: number, reason: string) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("lucky_claims")
    .update({ status: "cancelled", note: reason.slice(0, 200), delivered_by: by })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id, event_id")
    .maybeSingle();

  if (!data) return { ok: false as const, error: "مش قادرين نلغيها" };
  await log(data.event_id, by, "cancel_claim", { claim: claimId, reason });
  revalidatePath(`/lucky/${data.event_id}`);
  return { ok: true as const };
}

/** مسح حدث بالكامل — بيشيل محاولاته وجوايزه معاه */
export async function deleteEvent(eventId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { error } = await supabase.from("lucky_events").delete().eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/lucky");
  return { ok: true as const };
}

/* ── أغلفة للفورم: الفورم لازم يرجّع void ──────────────────── */

export async function setStatusForm(eventId: number, status: string, _fd: FormData) {
  await setStatus(eventId, status);
}

export async function rotateQrForm(eventId: number, _fd: FormData) {
  await rotateQr(eventId);
}

export async function removePrizeForm(eventId: number, prizeId: number, _fd: FormData) {
  await removePrize(eventId, prizeId);
}

export async function deliverClaimForm(claimId: number, _fd: FormData) {
  await deliverClaim(claimId);
}

export async function cancelClaimForm(claimId: number, reason: string, _fd: FormData) {
  await cancelClaim(claimId, reason);
}

export async function deleteEventForm(eventId: number, _fd: FormData) {
  const res = await deleteEvent(eventId);
  if (res.ok) redirect("/lucky");
}

/* ── مهمات البيت: الخادم بيتأكد من والدي الولد ──────────── */

/**
 * تأكيد المهمة ونزول البونص.
 *
 * البونص مابينزلش قبل كده أبدًا — ده اللي بيخلّي المهمة
 * حقيقية بدل ما الولد يقول «عملتها» وخلاص.
 */
export async function confirmHomeMission(missionId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data: row } = await supabase
    .from("lucky_home_missions")
    .select("id, event_id, student_id, mission_label, bonus_xp, status")
    .eq("id", missionId)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "المهمة دي مش موجودة" };
  if (row.status === "confirmed") return { ok: true as const };

  const res = await award({
    studentId: row.student_id,
    ruleCode: "home_mission",
    source: "teacher",
    dedupeKey: `home:${row.id}`,
    occurredOn: todayISO(),
    xpOverride: row.bonus_xp,
    note: `مهمة البيت — ${row.mission_label}`,
    createdBy: by,
  });
  if (!res.awarded && res.reason) {
    return { ok: false as const, error: res.reason };
  }

  await supabase
    .from("lucky_home_missions")
    .update({ status: "confirmed", decided_by: by, decided_at: new Date().toISOString() })
    .eq("id", missionId);

  await log(row.event_id, by, "home_mission:confirm", { missionId, xp: row.bonus_xp });
  revalidatePath(`/lucky/${row.event_id}`);
  revalidatePath("/hero", "layout");
  return { ok: true as const };
}

/** والديه قالوا إنها ماتعملتش — مفيش بونص، ومفيش عقاب كمان */
export async function rejectHomeMission(missionId: number) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data: row } = await supabase
    .from("lucky_home_missions")
    .select("id, event_id, status")
    .eq("id", missionId)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "المهمة دي مش موجودة" };

  await supabase
    .from("lucky_home_missions")
    .update({ status: "rejected", decided_by: by, decided_at: new Date().toISOString() })
    .eq("id", missionId);

  await log(row.event_id, by, "home_mission:reject", { missionId });
  revalidatePath(`/lucky/${row.event_id}`);
  return { ok: true as const };
}

export async function confirmHomeMissionForm(missionId: number, _fd: FormData) {
  await confirmHomeMission(missionId);
}

export async function rejectHomeMissionForm(missionId: number, _fd: FormData) {
  await rejectHomeMission(missionId);
}
