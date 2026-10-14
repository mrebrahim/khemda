import { redirect } from "next/navigation";
import HeroHeader from "@/components/HeroHeader";
import HeroTabs from "@/components/HeroTabs";
import { loadHero, missingConfig } from "@/lib/hero-data";

export const dynamic = "force-dynamic";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const missing = missingConfig();
  if (missing.length > 0) {
    return (
      <main className="g-bg min-h-screen grid place-items-center p-6 text-center text-white">
        <div>
          <p className="text-4xl mb-3">⚙️</p>
          <p className="font-bold">النظام لسه مش متظبّط</p>
          <p className="text-sm text-slate-400 mt-2">
            المشرف لازم يضيف{" "}
            <span dir="ltr" className="font-mono text-xs text-amber-400">
              {missing.join(" + ")}
            </span>{" "}
            في إعدادات Vercel
          </p>
        </div>
      </main>
    );
  }

  const state = await loadHero();
  if (!state) redirect("/hero/login");

  return (
    <div className="g-bg min-h-screen text-white pb-24">
      <HeroHeader state={state} />
      <div className="max-w-md mx-auto px-4">{children}</div>
      <HeroTabs />
    </div>
  );
}
