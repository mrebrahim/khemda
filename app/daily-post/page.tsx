import NavBar from "@/components/NavBar";
import DailyPostCard from "@/components/DailyPostCard";
import AdminPushCard from "@/components/AdminPushCard";
import { buildDailyPost } from "@/lib/daily-post";
import { getBaseUrl } from "@/lib/site";
import { formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DailyPostPage() {
  const baseUrl = await getBaseUrl();
  const post = await buildDailyPost(baseUrl);

  return (
    <>
      <NavBar title="بوست النهارده" back="/" />
      <main className="max-w-xl mx-auto px-3 py-4 space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">
            {formatArabicDate(post.date)}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            التصميم والكلام اتجهّزوا بأرقام النهارده. نزّل الصورة وانزلها على
            جروب الأولاد عشان يفتحوا ويعملوا مهماتهم.
          </p>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">
            {post.doneToday} من {post.activeStudents} خلّصوا مهمة النهارده لحد دلوقتي
          </p>
        </section>

        <AdminPushCard />

        <DailyPostCard post={post} shareUrl={`${baseUrl}/hero`} />
      </main>
    </>
  );
}
