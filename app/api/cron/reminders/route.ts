import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import {
  cairoHour,
  daysBetween,
  DEFAULT_PREFS,
  pickReminder,
  shiftDate,
  type ReminderKind,
  type ReminderSlot,
} from "@/lib/habits";
import { todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** رسايل مختلفة عشان التنبيه ما يبقاش ممل ولا متوقّع */
function message(kind: ReminderKind, streak: number, left: number, isMorning: boolean) {
  if (kind === "last_chance") {
    return streak >= 7
      ? {
          title: `🚨 آخر فرصة — سلسلة ${streak} يوم هتضيع!`,
          body: "مهمة واحدة بس قبل نص الليل وتفضل مكمّلة",
        }
      : {
          title: "🚨 آخر فرصة النهارده",
          body: "دقيقة واحدة وسلسلتك تكمّل 🔥",
        };
  }

  if (kind === "winback") {
    return {
      title: "😢 وحشتنا يا بطل",
      body: "ارجع دلوقتي وابدأ سلسلة جديدة — نقطك مستنياك",
    };
  }

  if (isMorning) {
    if (streak >= 7) {
      return {
        title: `🔓 المهمات فتحت — سلسلتك ${streak} يوم!`,
        body: "دقيقة واحدة دلوقتي وتفضل مكمّلة 🔥",
      };
    }
    return {
      title: "🔓 المهمات فتحت!",
      body: `صلاة + إصحاح = +${left} نقطة في رصيدك`,
    };
  }

  if (streak >= 7) {
    return {
      title: `🏆 ${streak} يوم ورا بعض!`,
      body: `${left === 1 ? "مهمة واحدة" : "مهمتين"} وتكمّل السلسلة يا أسطورة`,
    };
  }
  if (streak >= 3) {
    return {
      title: `🔥 سلسلتك ${streak} يوم`,
      body: "متسبهاش تقطع — دقيقة واحدة بس",
    };
  }
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
  const hour = cairoHour();
  const supabase = await createClient();

  const [{ data: subs }, { data: doneToday }, { data: streaks }, { data: prefsRows }, { data: logs }] =
    await Promise.all([
      supabase
        .from("push_subscriptions")
        .select("id, student_id, endpoint, p256dh, auth")
        .eq("is_active", true),
      supabase.from("daily_missions").select("student_id").eq("on_date", today),
      supabase
        .from("student_streaks")
        .select("student_id, current_streak, last_active_on"),
      supabase
        .from("reminder_prefs")
        .select("student_id, reminders_on, slot, daily_goal, paused_until"),
      supabase
        .from("reminder_log")
        .select("student_id, kind, on_date")
        .gte("on_date", shiftDate(today, -7)),
    ]);

  const doneCount = new Map<number, number>();
  for (const d of doneToday ?? []) {
    doneCount.set(d.student_id, (doneCount.get(d.student_id) ?? 0) + 1);
  }
  const streakOf = new Map((streaks ?? []).map((s) => [s.student_id, s]));
  const prefsOf = new Map((prefsRows ?? []).map((p) => [p.student_id, p]));

  const sentToday = new Set(
    (logs ?? []).filter((l) => l.on_date === today).map((l) => `${l.student_id}:${l.kind}`),
  );
  const lastWinback = new Map<number, string>();
  for (const l of logs ?? []) {
    if (l.kind !== "winback") continue;
    const prev = lastWinback.get(l.student_id);
    if (!prev || l.on_date > prev) lastWinback.set(l.student_id, l.on_date);
  }

  const stats = { daily: 0, last_chance: 0, winback: 0, skipped: 0, failed: 0 };

  for (const sub of subs ?? []) {
    const id = sub.student_id;
    const p = prefsOf.get(id) ?? { ...DEFAULT_PREFS, student_id: id };

    const done = doneCount.get(id) ?? 0;
    const goal = p.daily_goal ?? 2;
    const s = streakOf.get(id);
    const streak = s?.current_streak ?? 0;
    const idle = s?.last_active_on ? daysBetween(s.last_active_on, today) : 99;

    const kind = pickReminder({
      done,
      goal,
      streak,
      idle,
      hour,
      slot: (p.slot ?? "evening") as ReminderSlot,
      remindersOn: p.reminders_on ?? true,
      pausedUntil: p.paused_until ?? null,
      today,
      sentToday: new Set(
        (["daily", "last_chance", "winback"] as ReminderKind[]).filter((k) =>
          sentToday.has(`${id}:${k}`),
        ),
      ),
      lastWinback: lastWinback.get(id) ?? null,
    });

    if (!kind) {
      stats.skipped++;
      continue;
    }

    const payload = JSON.stringify({
      ...message(kind, streak, Math.max(1, goal - done), hour >= 6 && hour <= 9),
      url: "/hero/daily",
      tag: kind,
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      stats[kind]++;
      // الـunique index بيمنع التكرار لو اتبعت مرتين بالغلط
      await supabase
        .from("reminder_log")
        .insert({ student_id: id, kind, on_date: today });
      sentToday.add(`${id}:${kind}`);
      await supabase
        .from("push_subscriptions")
        .update({ last_sent_at: new Date().toISOString(), fail_count: 0 })
        .eq("id", sub.id);
    } catch (e) {
      stats.failed++;
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410 = الاشتراك مات (شال التطبيق أو مسح البيانات)
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

  // تذكير المشرف ينزّل بوست اليوم على الجروب — في جولة الصبح بس
  let adminSent = 0;
  if (hour >= 6 && hour <= 9) {
    const { data: adminSubs } = await supabase
      .from("admin_push")
      .select("id, endpoint, p256dh, auth")
      .eq("is_active", true);

    const isFriday = new Date(`${today}T12:00:00Z`).getUTCDay() === 5;
    const adminPayload = JSON.stringify({
      title: isFriday ? "🎨 بوست الجمعة جاهز" : "🎨 بوست النهارده جاهز",
      body: "نزّله على الجروب عشان الولاد يفتحوا ويعملوا مهماتهم",
      url: "/daily-post",
      tag: "admin-post",
    });

    for (const sub of adminSubs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          adminPayload,
        );
        adminSent++;
        await supabase
          .from("admin_push")
          .update({ last_sent_at: new Date().toISOString(), fail_count: 0 })
          .eq("id", sub.id);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("admin_push").update({ is_active: false }).eq("id", sub.id);
        } else {
          const { data: row } = await supabase
            .from("admin_push")
            .select("fail_count")
            .eq("id", sub.id)
            .maybeSingle();
          const next = (row?.fail_count ?? 0) + 1;
          await supabase
            .from("admin_push")
            .update({ fail_count: next, is_active: next < 5 })
            .eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, hour, date: today, adminSent, ...stats });
}
