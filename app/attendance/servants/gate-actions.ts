"use server";

import { revalidatePath } from "next/cache";
import { unlock, lock } from "@/lib/servants-gate";

export async function unlockServants(_prev: unknown, formData: FormData) {
  const code = String(formData.get("code") ?? "");

  if (!code) {
    return { error: "اكتب الكود السري" };
  }

  const ok = await unlock(code);
  if (!ok) {
    return { error: "الكود السري غلط" };
  }

  revalidatePath("/attendance/servants");
  revalidatePath("/reports");
  return { error: null };
}

export async function lockServants() {
  await lock();
  revalidatePath("/attendance/servants");
  revalidatePath("/reports");
}
