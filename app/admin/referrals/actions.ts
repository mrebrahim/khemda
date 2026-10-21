"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rejectReferral } from "@/lib/referral";

async function servant(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? (user.email ?? "servant") : null;
}

/** المشرف بيرفض دعوة مشبوهة — والنقط بترجع بقيد عكسي */
export async function reject(id: number, _fd: FormData) {
  const by = await servant();
  if (!by) return;
  await rejectReferral(id, by, "رفض المشرف");
  revalidatePath("/admin/referrals");
}
