import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makePass, readQrToken, PASS_COOKIE, PASS_SECONDS } from "@/lib/lucky";

export const dynamic = "force-dynamic";

/**
 * أول خطوة بعد مسح كود الصندوق.
 *
 * الكوكي مش بتتكتب من جوّه صفحة — ده ممنوع في Next، وكان بيرمي
 * خطأ سيرفر للولد أول ما يمسح. فالمسح بقى هنا: بنتأكد من الكود،
 * نكتب التصريح، وبعدين نوديه للصندوق.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const to = (query = "") => NextResponse.redirect(new URL(`/hero/drop${query}`, request.url));

  if (!token) return to();

  let check;
  try {
    const supabase = await createAdminClient();
    const { data: events } = await supabase.from("lucky_events").select("id, qr_epoch");
    check = readQrToken(token, (id) => (events ?? []).find((e) => e.id === id)?.qr_epoch ?? null);
  } catch {
    return to("?e=bad");
  }

  if (!check.ok) return to(`?e=${check.reason}`);

  const pass = makePass(check.eventId);
  if (!pass) return to("?e=not-configured");

  const res = to();
  res.cookies.set(PASS_COOKIE, pass, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PASS_SECONDS,
    path: "/hero",
  });
  return res;
}
