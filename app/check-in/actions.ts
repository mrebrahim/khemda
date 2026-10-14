"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lookupToken, checkIn, type ScanTarget, type CheckInResult } from "@/lib/checkin";

/** الخطوة الأولى: الخادم يشوف مين ده قبل ما يأكّد */
export async function identify(token: string): Promise<ScanTarget | null> {
  await requireServant();
  return lookupToken(token);
}

/** الخطوة التانية: الخادم يأكّد إن الولد موجود فعلاً */
export async function confirmCheckIn(token: string): Promise<CheckInResult> {
  const email = await requireServant();
  const res = await checkIn(token, `servant:${email}`);
  revalidatePath("/check-in");
  revalidatePath("/attendance/students");
  return res;
}

async function requireServant(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("لازم تسجّل دخول كخادم");
  return user.email ?? user.id;
}
