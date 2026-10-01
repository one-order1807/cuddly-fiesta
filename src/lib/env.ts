export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Dev-only admin preview with no Supabase. Hard-disabled in production builds. */
export const demoMode = process.env.NODE_ENV !== "production" && process.env.ADMIN_DEMO === "1";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
