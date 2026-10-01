import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const REMEMBER_COOKIE = "oo_remember";

/** httpOnly + secure session cookies. "Remember this device" = 30 days; otherwise a browser-session cookie. */
export function hardenCookie(options: Record<string, unknown> = {}, remember?: string) {
  const o: Record<string, unknown> = { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" };
  if (remember === "0") { delete o.maxAge; delete o.expires; }
  else if (remember === "1" && o.maxAge !== 0) o.maxAge = 60 * 60 * 24 * 30;
  return o;
}

/** Session-bound client (RLS applies as the signed-in admin). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          const remember = cookieStore.get(REMEMBER_COOKIE)?.value;
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, hardenCookie(options, remember)));
        } catch {
          /* called from a Server Component — the proxy refreshes the session instead */
        }
      },
    },
  });
}

/** Service-role client. Server-only: bypasses RLS. Use for audit/login-attempt writes and seed-type work. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous read client for the public website (no cookies → pages stay cacheable). */
export function createPublicClient() {
  return createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
