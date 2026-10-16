"use server";

import { revalidatePath } from "next/cache";
import { ensureStudentAccount, studentsWithoutCode } from "@/lib/student-code";

/** بيعمل كود لكل مخدوم نشط لسه ملهوش كود */
export async function generateMissingCodes() {
  const missing = await studentsWithoutCode();

  let created = 0;
  const failed: string[] = [];

  for (const s of missing) {
    const res = await ensureStudentAccount(s.id);
    if (res.ok && res.created) created++;
    else if (!res.ok) failed.push(s.full_name);
  }

  revalidatePath("/admin/cards");
  revalidatePath("/students");
  return { created, failed };
}
