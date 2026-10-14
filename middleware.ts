import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const path = request.nextUrl.pathname;

  // مسارات الطلاب ليها نظام دخول مستقل، والـcron والإشعارات بيتحققوا بنفسهم
  const selfGuarded =
    path === "/board" ||
    // لازم تطابق بالظبط: startsWith("/hero") كانت بتمسك /heroes كمان
    // وهي صفحة خدام، فكانت بتعدّي من غير تسجيل دخول
    path === "/hero" ||
    path.startsWith("/hero/") ||
    path.startsWith("/api/push") ||
    path.startsWith("/api/cron") ||
    path === "/sw.js" ||
    path === "/manifest.json";
  if (selfGuarded) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
