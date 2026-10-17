import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import {
  cairoHour,
  daysBetween,
  DEFAULT_PREFS,
  inReminderWindow,
  pickReminder,
  shiftDate,
  type ReminderKind,
} from "@/lib/habits";
import { dueEvents } from "@/lib/events";
import { todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** رسايل مختلفة عشان التنبيه ما يبقاش ممل ولا متوقّع */
function message(kind: ReminderKind, streak: number, left: number, justOpened: boolean) {
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

  if (justOpened) {
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

/**
 * الكرون بيجي من مكانين: Vercel Cron بسر البيئة، وجدول pg_cron في
 * سوپابيز بسر متخزّن في الداتابيز نفسها (الريبو عام فمفيش سر في الكود).
 */
async function authorized(auth: string | null): Promise<boolean> {
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (token.length < 16) return false;

  const envSecret = process.env.CRON_SECRET;
  if (envSecret && safeEqual(token, envSecret)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("name", "cron")
    .maybeSingle();
  return Boolean(data?.value) && safeEqual(token, data!.value);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  // Vercel Cron بيبعت الهيدر ده. في غير كده لازم السر.
  const auth = request.headers.get("authorization");
  if (!(await authorized(auth))) {
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
  const due = dueEvents(today, hour);

  // الكرون بيدق كل ساعة. أغلب الساعات مفيش فيها حاجة تتبعت،
  // فبنخرج بدري من غير ما نلمس الداتابيز.
  if (!inReminderWindow(hour) && due.length === 0) {
    return NextResponse.json({ ok: true, hour, date: today, idle: true });
  }

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
        .select("student_id, reminders_on, daily_goal, paused_until"),
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
      ...message(kind, streak, Math.max(1, goal - done), inReminderWindow(hour)),
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

  // تذكير المشرف ينزّل بوست اليوم على الجروب — مع فتح المهمات
  let adminSent = 0;
  if (inReminderWindow(hour)) {
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

  // ── تذكير مواعيد الخدمة: كل معاد في وقته بالظبط بتوقيت مصر ──
  // التسبحة الأحد ٧ م • مسابقة الخميس ٩ م • القداس الجمعة ٧ ص • مدارس الأحد ٢ م
  const events: { key: string; students: number; admins: number }[] = [];

  for (const ev of due) {
    // الصف ده قفل: الـunique (event, date) بيمنع إن التذكير يتبعت مرتين
    const { error: lockErr } = await supabase
      .from("event_reminder_log")
      .insert({ event_key: ev.key, on_date: today });
    if (lockErr) continue;

    const forStudents = JSON.stringify({
      ...ev.reminder,
      url: "/hero",
      tag: `event-${ev.key}`,
    });
    const forAdmins = JSON.stringify({
      title: `${ev.emoji} ${ev.label} — سجّل مين حضر`,
      body: "افتح الشاشة ودوس على اللي حضروا، والنقط تنزل لهم على طول",
      url: `/events/${ev.key}`,
      tag: `event-admin-${ev.key}`,
    });

    let toStudents = 0;
    for (const sub of subs ?? []) {
      const p = prefsOf.get(sub.student_id);
      if (p && p.reminders_on === false) continue;
      if (p?.paused_until && p.paused_until >= today) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          forStudents,
        );
        toStudents++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        }
      }
    }

    const { data: adminRows } = await supabase
      .from("admin_push")
      .select("id, endpoint, p256dh, auth")
      .eq("is_active", true);

    let toAdmins = 0;
    for (const sub of adminRows ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          forAdmins,
        );
        toAdmins++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("admin_push").update({ is_active: false }).eq("id", sub.id);
        }
      }
    }

    await supabase
      .from("event_reminder_log")
      .update({ sent_students: toStudents, sent_admins: toAdmins })
      .eq("event_key", ev.key)
      .eq("on_date", today);

    events.push({ key: ev.key, students: toStudents, admins: toAdmins });
  }

  return NextResponse.json({ ok: true, hour, date: today, adminSent, events, ...stats });
}
