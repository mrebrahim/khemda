import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * عميل بصلاحيات كاملة للعمليات اللي مش ورا حساب Supabase.
 *
 * الطلاب بيدخلوا بكوكي خاصة بينا مش بجلسة Supabase، فطلباتهم بتوصل
 * لقاعدة البيانات كزائر مجهول وRLS بيرفضها. العميل ده بيتخطّى RLS،
 * والتحقق من الهوية بيتعمل في الكود قبل أي استدعاء: currentHero()
 * للطلاب، وservantsGateState() لسكشن الخدام.
 *
 * بيشتغل على السيرفر بس — المفتاح عمره ما بيوصل للمتصفح.
 *
 * لو المفتاح مش متظبّط، بيرجع للعميل العادي بدل ما يقع. كده صفحات
 * الخدام تفضل شغالة بجلستهم، وصفحات الطلاب بس هي اللي بتتعطّل
 * وبتوضّح السبب.
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return createServerClient();

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
