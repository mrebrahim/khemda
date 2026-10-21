import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRules } from "@/lib/xp";
import { todayISO } from "@/lib/types";

export type DailyPost = {
  date: string;
  /** جمعة؟ يوم الخدمة ليه بوست مختلف */
  isFriday: boolean;
  prayerXp: number;
  bibleXp: number;
  dailyXp: number;
  fridayMax: number;
  /** كام ولد عمل مهمة النهارده */
  doneToday: number;
  activeStudents: number;
  top3: { name: string; xp: number }[];
  headline: string;
  hype: string;
  caption: string;
};

export async function buildDailyPost(baseUrl: string): Promise<DailyPost> {
  const date = todayISO();
  const isFriday = new Date(`${date}T12:00:00Z`).getUTCDay() === 5;

  const supabase = await createClient();
  const admin = await createAdminClient();

  const [rules, { data: board }, { data: done }, { count: activeStudents }] =
    await Promise.all([
      getRules(),
      supabase
        .from("board_leaderboard")
        .select("display_name, total_xp")
        .order("total_xp", { ascending: false })
        .limit(3),
      admin.from("daily_missions").select("student_id").eq("on_date", date),
      supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  const xpOf = (code: string) => rules.find((r) => r.code === code)?.xp ?? 0;
  const prayerXp = xpOf("prayer");
  const bibleXp = xpOf("bible");
  const fridayMax = rules
    .filter((r) => r.category === "friday" && r.is_active && !/_(1st|2nd|3rd)$/.test(r.code))
    .reduce((n, r) => n + r.xp, 0);

  const doneToday = new Set((done ?? []).map((d) => d.student_id)).size;

  const top3 = (board ?? []).map((b) => ({
    name: b.display_name as string,
    xp: b.total_xp as number,
  }));

  const headline = isFriday
    ? "النهارده الجمعة — يوم الخدمة!"
    : "المهمات فتحت 🌙";

  const hype = isFriday
    ? `احضر الخدمة والقداس وخد لحد +${fridayMax} نقطة في يوم واحد`
    : doneToday > 0
      ? `${doneToday} بطل خلّصوا مهماتهم النهارده — إنت فين؟`
      : "أول واحد يخلّص مهماته النهارده يكسب نقط قبل الكل";

  const caption = [
    `🛡️ *أبطال المهمة* — ${headline}`,
    "",
    isFriday
      ? `⛪ يوم الجمعة أكبر كنز نقط في الأسبوع: لحد *+${fridayMax} نقطة* (الخدمة + القداس + التناول + التسبحة + تيجي بدري).`
      : `🌙 مهمات النهارده فتحت (من ٧ بالليل لحد نص الليل):\n🙏 الصلاة اليومية (+${prayerXp})\n📖 إصحاح من الكتاب المقدس (+${bibleXp})`,
    "",
    top3.length > 0
      ? `🏆 المتصدّرين دلوقتي:\n${top3
          .map((t, i) => `${["🥇", "🥈", "🥉"][i]} ${t.name} — ${t.xp} نقطة`)
          .join("\n")}`
      : "",
    "",
    `🔥 ${hype}`,
    "",
    `ادخل بالكود اللي على كارتك:\n${baseUrl}/hero`,
    `وشوف ترتيبك هنا:\n${baseUrl}/board`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    date,
    isFriday,
    prayerXp,
    bibleXp,
    dailyXp: prayerXp + bibleXp,
    fridayMax,
    doneToday,
    activeStudents: activeStudents ?? 0,
    top3,
    headline,
    hype,
    caption,
  };
}
