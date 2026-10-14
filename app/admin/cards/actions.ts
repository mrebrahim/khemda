"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** بعد ما الخادم يطبّع الكروت ويوزّعها، بنمسح الأرقام السرية من قاعدة البيانات */
export async function markPrinted() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_accounts")
    .update({ initial_pin: null, card_printed_at: new Date().toISOString() })
    .not("initial_pin", "is", null);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cards");
}
