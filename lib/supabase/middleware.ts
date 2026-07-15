import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const applySecurityHeaders = (result: NextResponse) => {
    result.headers.set("X-Content-Type-Options", "nosniff");
    result.headers.set("X-Frame-Options", "DENY");
    result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    result.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return result;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return applySecurityHeaders(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/panel") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }
  if (request.nextUrl.pathname === "/login" && user) return applySecurityHeaders(NextResponse.redirect(new URL("/panel", request.url)));
  if (user && request.nextUrl.pathname.startsWith("/panel")) {
    const profile = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
    const role = profile.data?.active ? profile.data.role : "sales";
    const adminOnly = ["/panel/urunler", "/panel/stok", "/panel/tedarikciler", "/panel/raporlar", "/panel/gecmis"];
    const superAdminOnly = ["/panel/ayarlar"];
    const isAdminPath = adminOnly.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
    const isSuperAdminPath = superAdminOnly.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
    if ((isSuperAdminPath && role !== "super_admin") || (isAdminPath && role !== "admin" && role !== "super_admin")) return applySecurityHeaders(NextResponse.redirect(new URL("/panel", request.url)));
  }
  return applySecurityHeaders(response);
}
