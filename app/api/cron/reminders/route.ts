import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** رسائل مختلفة عشان التنبيه ما يبقاش ممل */
function message(streak: number, atRisk: boolean) {
  if (atRisk && streak >= 7)
    return {
      title: `🔥 سلسلتك ${streak} يوم في خطر!`,
      body: "مهمة واحدة بس النهارده وتفضل مكمّلة",
    };
  if (atRisk)
    return {
      title: "🔥 متسبش سلسلتك تقطع",
      body: "دقيقة واحدة وتخلّص مهمة النهارده",
    };
  if (streak >= 7)
    return {
      title: `🏆 ${streak} يوم ورا بعض!`,
      body: "كمّل السلسلة النهارده يا أسطورة",
    };
  return {
    title: "🛡️ مهمات النهارده مستنياك",
    body: "صلاة + إصحاح = نقط جديدة في رصيدك",
  };
}

export async function GET(request: Request) {
  // Vercel Cron بيبعت الهيدر ده. في غير كده لازم السر.
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    return NextResponse.json({ error: "مفاتيح الإشعارات ناقصة" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:noreply@khedma.app", pub, priv);

  const today = todayISO();
  const supabase = await createClient();

  const [{ data: subs }, { data: doneToday }, { data: streaks }, { data: alreadySent }] =
    await Promise.all([
      supabase
        .from("push_subscriptions")
        .select("id, student_id, endpoint, p256dh, auth")
        .eq("is_active", true),
      supabase.from("daily_missions").select("student_id, rule_code").eq("on_date", today),
      supabase.from("student_streaks").select("student_id, current_streak, last_active_on"),
      supabase.from("reminder_log").select("student_id").eq("kind", "daily").eq("on_date", today),
    ]);

  // اللي خلّص المهمتين النهارده مش محتاج تنبيه
  const counts = new Map<number, number>();
  for (const d of doneToday ?? []) {
    counts.set(d.student_id, (counts.get(d.student_id) ?? 0) + 1);
  }
  const sentTo = new Set((alreadySent ?? []).map((r) => r.student_id));
  const streakOf = new Map(
    (streaks ?? []).map((s) => [s.student_id, s]),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    if ((counts.get(sub.student_id) ?? 0) >= 2 || sentTo.has(sub.student_id)) {
      skipped++;
      continue;
    }

    const s = streakOf.get(sub.student_id);
    const streak = s?.current_streak ?? 0;
    // في خطر = آخر نشاط كان أمبارح ولسه ماعملش حاجة النهارده
    const atRisk = Boolean(
      s?.last_active_on &&
        streak > 0 &&
        Math.round(
          (Date.parse(today) - Date.parse(s.last_active_on)) / 86_400_000,
        ) === 1,
    );

    const payload = JSON.stringify({ ...message(streak, atRisk), url: "/hero", tag: "daily" });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
      await supabase
        .from("reminder_log")
        .insert({ student_id: sub.student_id, kind: "daily", on_date: today });
      await supabase
        .from("push_subscriptions")
        .update({ last_sent_at: new Date().toISOString(), fail_count: 0 })
        .eq("id", sub.id);
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410 = الاشتراك مات (المستخدم شال التطبيق أو مسح البيانات)
      if (code === 404 || code === 410) {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);
      } else {
        // عطل مؤقت — نعدّ الفشل وبعد ٥ مرات نوقف الاشتراك
        const { data: row } = await supabase
          .from("push_subscriptions")
          .select("fail_count")
          .eq("id", sub.id)
          .maybeSingle();
        const next = (row?.fail_count ?? 0) + 1;
        await supabase
          .from("push_subscriptions")
          .update({ fail_count: next, is_active: next < 5 })
          .eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed, date: today });
}
