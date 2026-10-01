import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin guard (optimistic): refreshes the Supabase session cookie and redirects
 * unauthenticated visitors to /admin/login. The authoritative role/active check
 * happens in the (portal) layout against `admin_users`.
 * Also sets a per-request nonce CSP and noindex for everything under /admin.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "";
  const wsOrigin = supabaseOrigin.replace(/^http/, "ws");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // runtime-injected styles (toasts, charts); scripts stay nonce-strict
    `img-src 'self' blob: data: ${supabaseOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${wsOrigin} ${apiOrigin}${isDev ? " ws://localhost:*" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const seal = (r: NextResponse) => {
    r.headers.set("Content-Security-Policy", csp);
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  };

  const demo = process.env.NODE_ENV !== "production" && process.env.ADMIN_DEMO === "1";
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (demo || !configured) return seal(response);

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        const remember = request.cookies.get("oo_remember")?.value;
        list.forEach(({ name, value, options }) => {
          const o: Record<string, unknown> = { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" };
          if (remember === "0") { delete o.maxAge; delete o.expires; } else if (remember === "1" && o.maxAge !== 0) o.maxAge = 60 * 60 * 24 * 30;
          response.cookies.set(name, value, o);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isPublicAdminPath = pathname === "/admin/login" || pathname.startsWith("/admin/forgot") || pathname.startsWith("/admin/reset") || pathname.startsWith("/admin/auth/");

  if (!data.user && !isPublicAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return seal(NextResponse.redirect(url));
  }
  if (data.user && pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return seal(NextResponse.redirect(url));
  }
  return seal(response);
}

export const config = { matcher: ["/admin/:path*"] };
