import { NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero } from "@/lib/student-auth";

export async function POST(request: Request) {
  const hero = await currentHero();
  if (!hero) {
    return NextResponse.json({ error: "مش مسجّل دخول" }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات مش مظبوطة" }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return NextResponse.json({ error: "الاشتراك ناقص" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      student_id: hero.studentId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
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
