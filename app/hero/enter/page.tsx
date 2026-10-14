import { redirect } from "next/navigation";
import Link from "next/link";
import { heroLogin } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

/**
 * الولد بيمسح الـQR اللي على كارته فييجي هنا، وبيتسجّل دخوله
 * على طول من غير ما يكتب حاجة.
 */
export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  if (c) {
    const res = await heroLogin(c);
    if (res.ok) redirect("/hero");
  }

  return (
    <main className="g-bg min-h-screen grid place-items-center px-5 text-center text-white">
      <div>
        <p className="text-5xl mb-3">🛡️</p>
        <p className="font-bold text-lg">مقدرناش ندخّلك بالكود ده</p>
        <p className="text-sm text-slate-400 mt-2">
          جرّب تمسح الكود تاني، أو ادخل بكودك بإيدك
        </p>
        <Link
          href="/hero/login"
          className="inline-block mt-5 bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 transition"
        >
          ادخل بالكود
        </Link>
      </div>
    </main>
  );
}
