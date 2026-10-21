import HeroLoginForm from "@/components/HeroLoginForm";

export const dynamic = "force-dynamic";

export default async function HeroLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // مسارات داخلية بس — عشان محدش يستعمل اللينك لتحويل بره الموقع
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return <HeroLoginForm next={safe} />;
}
