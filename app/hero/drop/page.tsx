import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LuckyBox from "@/components/LuckyBox";
import { currentHero } from "@/lib/student-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkEligibility,
  getEvent,
  makePass,
  readPass,
  readQrToken,
  PASS_COOKIE,
  PASS_SECONDS,
  type LuckyAttempt,
} from "@/lib/lucky";

export const dynamic = "force-dynamic";

export default async function DropPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const jar = await cookies();

  // ١) مين الولد
  const hero = await currentHero();
  if (!hero) {
    const next = t ? `/hero/drop?t=${encodeURIComponent(t)}` : "/hero/drop";
    redirect(`/hero/login?next=${encodeURIComponent(next)}`);
  }

  // ٢) الكود: يا إما جاي من المسح دلوقتي، يا إما تصريح لسه صالح
  let eventId = readPass(jar.get(PASS_COOKIE)?.value);

  if (t) {
    const supabase = await createAdminClient();
    const { data: events } = await supabase.from("lucky_events").select("id, qr_epoch");
    const epochOf = (id: number) =>
      (events ?? []).find((e) => e.id === id)?.qr_epoch ?? null;

    const check = readQrToken(t, epochOf);
    if (check.ok) {
      eventId = check.eventId;
      const pass = makePass(eventId);
      if (pass) {
        jar.set(PASS_COOKIE, pass, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: PASS_SECONDS,
          path: "/hero",
        });
      }
    } else if (!eventId) {
      return (
        <Shell>
          <p className="text-5xl mb-3">⌛</p>
          <p className="font-bold text-white">
            {check.reason === "expired" ? "الكود خلصت صلاحيته" : "الكود ده مش مظبوط"}
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            الكود بيتغيّر كل نص دقيقة — امسحه تاني من عند الخادم.
          </p>
        </Shell>
      );
    }
  }

  if (!eventId) {
    return (
      <Shell>
        <p className="text-5xl mb-3">🎁</p>
        <p className="font-bold text-white">امسح كود الصندوق</p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          الصندوق بيفتح لما تمسح الكود اللي عند خادمك في الاجتماع.
        </p>
      </Shell>
    );
  }

  const event = await getEvent(eventId);
  if (!event) {
    return (
      <Shell>
        <p className="text-5xl mb-3">🤷</p>
        <p className="font-bold text-white">الحدث ده مش موجود</p>
      </Shell>
    );
  }

  const eligible = await checkEligibility(event, hero.studentId);

  if (!eligible.ok) {
    const prev = eligible.attempt as LuckyAttempt | undefined;
    return (
      <Shell>
        {prev ? (
          <LuckyBox
            title={event.title}
            left={0}
            previous={{
              label: prev.prize_label ?? "مكافأة",
              kind: prev.prize_kind ?? "xp",
              xp: prev.prize_xp,
              taayo: prev.prize_taayo,
            }}
          />
        ) : (
          <>
            <p className="text-5xl mb-3">🔒</p>
            <p className="font-bold text-white">{eligible.reason}</p>
            <Link
              href="/hero"
              className="inline-block mt-5 border-2 border-white/25 text-white font-bold px-5 py-2.5"
            >
              ارجع لمهماتك
            </Link>
          </>
        )}
      </Shell>
    );
  }

  return (
    <Shell wide>
      <LuckyBox title={event.title} left={eligible.left} previous={null} />
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="arena min-h-screen text-white px-3 py-8">
      <div className={`mx-auto ${wide ? "max-w-md" : "max-w-sm b-frame p-6 text-center"}`}>
        {children}
      </div>
    </main>
  );
}
