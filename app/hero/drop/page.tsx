import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DropFlow from "@/components/DropFlow";
import { missionOffer } from "./actions";
import { pickQuestion } from "@/lib/lucky-missions";
import { currentHero } from "@/lib/student-auth";
import {
  checkEligibility,
  getEvent,
  readPass,
  PASS_COOKIE,
  type LuckyAttempt,
} from "@/lib/lucky";

export const dynamic = "force-dynamic";

export default async function DropPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; e?: string }>;
}) {
  const { t, e } = await searchParams;

  // كود جاي على الصفحة على طول (كود قديم معروض على شاشة) —
  // بنوديه للمسح عشان هو اللي بيكتب التصريح
  if (t) redirect(`/hero/drop/scan?t=${encodeURIComponent(t)}`);

  const jar = await cookies();

  // ١) مين الولد
  const hero = await currentHero();
  // التصريح اتكتب في الكوكي قبل ما يوصل هنا، فبعد الدخول
  // بيرجع يلاقي الصندوق مفتوح
  if (!hero) redirect(`/hero/login?next=${encodeURIComponent("/hero/drop")}`);

  // ٢) التصريح اللي كتبه المسح — هو إثبات إنه مسح الكود فعلاً
  const eventId = readPass(jar.get(PASS_COOKIE)?.value);

  if (!eventId && e) {
    return (
      <Shell>
        <p className="text-5xl mb-3">⌛</p>
        <p className="font-bold text-white">
          {e === "expired" ? "الكود خلصت صلاحيته" : "الكود ده مش مظبوط"}
        </p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          الكود بيتغيّر كل دقيقة — امسحه تاني من عند الخادم.
        </p>
      </Shell>
    );
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
          <DropFlow
            title={event.title}
            left={0}
            firstQuestion={null}
            offer={await missionOffer()}
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
      <DropFlow
        title={event.title}
        left={eligible.left}
        previous={null}
        firstQuestion={pickQuestion()}
      />
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
