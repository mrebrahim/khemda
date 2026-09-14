"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "اكتب البريد وكلمة السر" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // "Invalid login credentials" معناها البيانات غلط،
    // أي رسالة تانية معناها مشكلة في الإعداد نفسه فبنوضّحها.
    const isBadCredentials =
      error.status === 400 && /invalid login credentials/i.test(error.message);

    return {
      error: isBadCredentials
        ? "البريد أو كلمة السر غير صحيحة"
        : `مشكلة في تسجيل الدخول: ${error.message}`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
