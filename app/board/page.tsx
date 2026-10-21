import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentHero } from "@/lib/student-auth";
import { STAGES, AREAS } from "@/lib/types";
import {
  progressFor,
  type BoardRank,
  type BoardRow,
  type Ranked,
} from "@/lib/board";
import BoardFilters from "@/components/BoardFilters";
import BoardList from "@/components/board/BoardList";
import MyCard from "@/components/board/MyCard";
import Podium from "@/components/board/Podium";
import Prizes from "@/components/board/Prizes";
import Sparks from "@/components/board/Sparks";
import MusicToggle from "@/components/MusicToggle";

export const dynamic = "force-dynamic";

// صفحة عامة بس مش بتتفهرس في محركات البحث — أسامي أطفال
export const metadata: Metadata = {
  title: "لوحة الأبطال",
  robots: { index: false, follow: false, nocache: true },
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; area?: string }>;
}) {
  const { stage, area } = await searchParams;

  // الصفحة مفتوحة للزائر، فبتقرا من views فيها الأعمدة الآمنة بس
  const supabase = await createClient();
  const [{ data: season }, { data: rows }, { data: rankRows }, hero] = await Promise.all([
    supabase.from("board_season").select("name").maybeSingle(),
    supabase
      .from("board_leaderboard")
      .select(
        "id, display_name, area, stage, verified_xp, total_xp, rank_name, rank_tier, rank_level",
      )
      // الترتيب بالليفل الأول وبعدين النقط — زي ما بيظهر للولد بالظبط
      .order("rank_level", { ascending: false })
      .order("total_xp", { ascending: false })
      .order("display_name", { ascending: true }),
    supabase.from("board_ranks").select("level, name, tier, xp_required"),
    currentHero(),
  ]);

  const ranks = (rankRows ?? []) as BoardRank[];
  const all = (rows ?? []) as BoardRow[];
  const filtered = all.filter(
    (s) => (!stage || s.stage === stage) && (!area || s.area === area),
  );

  // المركز + تقدّم كل بطل للمستوى اللي بعده (من سلّم الرتب الموجود)
  const ranked: Ranked[] = filtered.map((s, i) => {
    const p = progressFor(s.total_xp, ranks);
    return {
      ...s,
      place: i + 1,
      isMe: hero?.studentId === s.id,
      toNext: p.toNext,
      percent: p.percent,
      nextLevel: p.next?.level ?? null,
    };
  });

  const [first, second, third] = ranked;
  const me = ranked.find((r) => r.isMe) ?? null;
  const gapAbove =
    me && me.place > 1 ? ranked[me.place - 2].total_xp - me.total_xp : null;

  return (
    <main className="arena min-h-screen text-white pb-14">
      <Sparks />

      {/* ===== الهيدر ===== */}
      <header className="relative px-3 pt-8 pb-5 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-center gap-2 sm:gap-6">
            <p className="arena-banner hidden sm:block self-center px-3 py-2 text-[11px] font-bold text-amber-300 leading-snug max-w-[150px]">
              أبطال إعدادي...
              <br />
              من هنا تُصنع الأساطير!
            </p>

            <div className="min-w-0">
              <h1 className="arena-title font-bold text-[34px] sm:text-5xl leading-[1.15]">
                🏆 لوحة الأبطال
              </h1>
              <p className="arena-ribbon inline-block px-5 py-1 mt-2 text-sm font-bold text-amber-200">
                {season?.name ?? "الموسم"}
              </p>
              <div className="mt-3">
                <MusicToggle />
              </div>
            </div>

            <p className="arena-banner hidden sm:block self-center px-3 py-2 text-[11px] font-bold text-cyan-200 leading-snug max-w-[150px]">
              كل نقطة
              <br />
              تقرّبك من القمة! ⚡
            </p>
          </div>

          {/* على الموبايل العبارات تحت العنوان عشان تفضل مقروءة */}
          <div className="flex sm:hidden gap-2 mt-3 justify-center">
            <p className="arena-banner px-2.5 py-1.5 text-[10px] font-bold text-amber-300 leading-snug">
              من هنا تُصنع الأساطير!
            </p>
            <p className="arena-banner px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 leading-snug">
              كل نقطة تقرّبك من القمة! ⚡
            </p>
          </div>
        </div>
      </header>

      <div className="relative max-w-5xl mx-auto px-3">
        {ranked.length === 0 ? (
          <p className="text-center text-slate-400 py-20">لسه مفيش نقط مسجّلة</p>
        ) : (
          <>
            {/* ===== منصة أول ٣ ===== */}
            <section
              id="podium"
              className="grid grid-cols-3 gap-1.5 sm:gap-4 items-end mt-3 mb-6 max-w-2xl mx-auto"
              aria-label="أفضل ٣ أبطال"
            >
              <Podium person={second} place={2} />
              <Podium person={first} place={1} />
              <Podium person={third} place={3} />
            </section>

            {/* ===== الفلاتر ===== */}
            <BoardFilters
              stage={stage}
              area={area}
              stages={[...STAGES]}
              areas={[...AREAS]}
            />

            <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-5 lg:items-start mt-4">
              {/* ===== الجانب: مستواك + الجوايز ===== */}
              <aside className="space-y-3 lg:order-2 lg:sticky lg:top-4">
                {me ? (
                  <MyCard me={me} total={ranked.length} gapAbove={gapAbove} />
                ) : (
                  <section className="b-frame p-4 text-center">
                    <p className="text-2xl" aria-hidden="true">
                      🎮
                    </p>
                    <p className="font-bold text-white mt-1">عايز تشوف مستواك؟</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      ادخل بالكود اللي على كارتك وهتلاقي مركزك ونقطك واللي فاضلك
                      على المستوى الجاي.
                    </p>
                    <Link
                      href="/hero/login"
                      className="block mt-3 py-2.5 font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
                    >
                      ادخل بكودك
                    </Link>
                  </section>
                )}

                <Prizes ranks={ranks} />
              </aside>

              {/* ===== باقي الأبطال ===== */}
              <div className="mt-3 lg:mt-0 lg:order-1">
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h2 className="font-bold text-white">⚔️ باقي الأبطال</h2>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {ranked.length} بطل في الموسم
                  </span>
                </div>

                <BoardList rows={ranked} meId={me?.id ?? null} />

                <p className="text-center text-slate-400 text-xs mt-7 leading-relaxed">
                  الترتيب على النقط الموثقة من الحضور والمسابقات.
                  <br />
                  مهمات الصلاة والكتاب ليها نقطها بس مش داخلة في الترتيب ده.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== شريط الحماس تحت ===== */}
      <p className="relative mx-auto mt-8 max-w-2xl px-3">
        <span className="arena-ribbon block text-center py-3 font-bold text-amber-200 text-sm sm:text-base">
          🎮 تافس .. اجمع نقاط .. اصعد للقمة! 👑
        </span>
      </p>
    </main>
  );
}
