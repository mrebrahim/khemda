import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { currentHero } from "@/lib/student-auth";
import { qrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function HeroCard() {
  const hero = await currentHero();
  if (!hero) redirect("/hero/login");

  const supabase = await createClient();

  const [{ data: token }, { data: account }, { data: student }] = await Promise.all([
    supabase
      .from("qr_tokens")
      .select("token")
      .eq("student_id", hero.studentId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("student_accounts")
      .select("login_code")
      .eq("student_id", hero.studentId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("class_id")
      .eq("id", hero.studentId)
      .maybeSingle(),
  ]);

  const { data: servantRows } = student?.class_id
    ? await supabase
        .from("servants")
        .select("full_name")
        .eq("class_id", student.class_id)
        .eq("is_active", true)
        .order("full_name")
    : { data: [] };

  const servantNames = (servantRows ?? []).map((s) => s.full_name);

  const qr = token ? await qrDataUrl(token.token, 320) : null;

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="max-w-sm mx-auto">
        <Link
          href="/hero"
          className="text-white/70 text-sm hover:text-white inline-block mb-4"
        >
          ← رجوع
        </Link>

        <div className="bg-white rounded-3xl p-5 text-center shadow-2xl">
          <p className="text-xs text-slate-400">كارت البطل</p>
          <h1 className="font-bold text-xl text-slate-900 mt-0.5">
            {hero.nickname || hero.fullName}
          </h1>
          <p className="text-xs text-slate-500">
            {[hero.area, hero.stage].filter(Boolean).join(" — ")}
          </p>

          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="كود الحضور"
                width={320}
                height={320}
                className="w-full max-w-[240px] mx-auto my-4"
              />
              <p className="text-sm font-bold text-slate-700">
                ورّي الكود ده لخادمك عشان يسجّل حضورك
              </p>
            </>
          ) : (
            <p className="py-10 text-slate-400">مفيش كود — كلّم خادمك</p>
          )}

          {account && (
            <div className="bg-slate-100 rounded-xl py-2 mt-4">
              <p className="text-[11px] text-slate-500">كود الدخول</p>
              <p className="font-bold text-xl tracking-[0.2em]" dir="ltr">
                {account.login_code}
              </p>
            </div>
          )}

          {servantNames.length > 0 && (
            <p className="text-xs text-slate-500 mt-3">
              خادمك: <b>{servantNames.join(" • ")}</b>
            </p>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-4">
          خلّي سطوع الشاشة عالي عشان الكاميرا تقراه بسرعة
        </p>
      </div>
    </main>
  );
}
