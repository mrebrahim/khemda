"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function servant(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? (user.email ?? "servant") : null;
}

/** سحب جديد للموسم الشغّال */
export async function createDraw(formData: FormData) {
  const by = await servant();
  if (!by) return;

  const supabase = await createAdminClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!season) return;

  const title = String(formData.get("title") ?? "").trim().slice(0, 80) || "سحب آخر الموسم";
  const minXp = Math.max(0, Number(formData.get("min_xp") ?? 200));
  const excludeTop = Math.max(0, Math.min(20, Number(formData.get("exclude_top") ?? 3)));

  // كل جايزة في سطر
  const prizes = String(formData.get("prizes") ?? "")
    .split("\n")
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 30);

  if (prizes.length === 0) return;

  await supabase.from("season_draws").insert({
    season_id: season.id,
    title,
    min_xp: minXp,
    exclude_top: excludeTop,
    prizes,
    created_by: by,
  });

  revalidatePath("/draw");
}

export type RunResult =
  | { ok: true; winners: { full_name: string; prize_label: string; season_xp: number }[] }
  | { ok: false; error: string };

/**
 * السحب نفسه.
 *
 * بيحصل جوّه الداتابيز في معاملة واحدة مع قفل على الصف، فلو
 * اتنين خدام دوسوا في نفس اللحظة واحد بس بيسحب. والبذرة
 * بتتسجّل، فأي حد يقدر يراجع إن السحب اتعمل مرة واحدة بس.
 */
export async function runDraw(drawId: number): Promise<RunResult> {
  const by = await servant();
  if (!by) return { ok: false, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("run_season_draw", {
    p_draw_id: drawId,
    p_by: by,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/draw");
  revalidatePath("/hero", "layout");
  return {
    ok: true,
    winners: (data ?? []) as RunResult extends { ok: true; winners: infer W } ? W : never,
  };
}

export async function toggleDelivered(drawId: number, studentId: number, delivered: boolean) {
  const by = await servant();
  if (!by) return { ok: false as const, error: "لازم تسجّل دخول" };

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("season_draw_winners")
    .update({ delivered })
    .eq("draw_id", drawId)
    .eq("student_id", studentId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/draw");
  return { ok: true as const };
}

export async function runDrawForm(drawId: number, _fd: FormData) {
  await runDraw(drawId);
}

export async function deliveredForm(
  drawId: number,
  studentId: number,
  delivered: boolean,
  _fd: FormData,
) {
  await toggleDelivered(drawId, studentId, delivered);
}
