import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** اشتراك جهاز المشرف في تنبيه البوست اليومي */
export async function POST(request: Request) {
  // لازم يكون خادم مسجّل دخول
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "مش مسجّل دخول" }, { status: 401 });
  }

  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات مش مظبوطة" }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return NextResponse.json({ error: "الاشتراك ناقص" }, { status: 400 });
  }

  const { error } = await supabase.from("admin_push").upsert(
    {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      label: user.email ?? null,
      is_active: true,
      fail_count: 0,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
