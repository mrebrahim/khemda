"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireServant(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("لازم تسجّل دخول");
  return user.email ?? user.id;
}

export async function decide(
  id: number,
  status: "approved" | "delivered" | "rejected",
) {
  const by = await requireServant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("reward_claims")
    .update({ status, decided_at: new Date().toISOString(), decided_by: by })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/claims");
}
