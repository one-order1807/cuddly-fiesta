"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createClient, createServiceClient, REMEMBER_COOKIE } from "@/lib/supabase/server";
import { demoMode, siteUrl, supabaseConfigured } from "@/lib/env";
import { loginGate, recordLogin } from "@/lib/admin/ratelimit";
import { audit } from "@/lib/admin/audit";
import { getAdmin } from "@/lib/admin/session";

export type LoginState =
  | { step: "credentials"; error?: string; nonce?: number }
  | { step: "mfa"; factorId: string; error?: string; nonce?: number }
  | { step: "done"; next: string; mustChange: boolean };

const GENERIC = "Invalid email or password.";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const creds = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200), remember: z.string().optional(), next: z.string().optional() });

function safeNext(n?: string) {
  return n && n.startsWith("/admin") && !n.startsWith("//") && !n.startsWith("/admin/login") ? n : "/admin";
}

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const nonce = Date.now();
  if (demoMode) return { step: "done", next: "/admin", mustChange: false };
  if (!supabaseConfigured) return { step: "credentials", error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.", nonce };

  const parsed = creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { step: "credentials", error: GENERIC, nonce };
  const { email, password, remember } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const gate = await loginGate(email, ip);
  if (gate.locked) {
    await audit(null, { action: "login_locked", email });
    return { step: "credentials", error: `Too many attempts. Try again in about ${gate.retryInMin} minutes.`, nonce };
  }
  if (gate.delayMs) await sleep(gate.delayMs); // progressive delay

  const jar = await cookies();
  jar.set(REMEMBER_COOKIE, remember ? "1" : "0", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}) });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await recordLogin(email, ip, false);
    await audit(null, { action: "login_failed", email });
    return { step: "credentials", error: GENERIC, nonce };
  }

  // Must be an active admin — otherwise treat as invalid (don't reveal which part failed).
  const admin = await getAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    await recordLogin(email, ip, false);
    await audit(null, { action: "login_failed", email, meta: { reason: "not_admin" } });
    return { step: "credentials", error: GENERIC, nonce };
  }

  // TOTP required?
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (totp) return { step: "mfa", factorId: totp.id, nonce };
  }

  await finishLogin(admin.id, admin.email, email, ip);
  return { step: "done", next: safeNext(parsed.data.next), mustChange: admin.mustChangePassword };
}

export async function verifyMfa(_prev: LoginState, form: FormData): Promise<LoginState> {
  const nonce = Date.now();
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createClient();
  const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
  if (e1 || !ch) return { step: "mfa", factorId, error: "Could not start verification. Sign in again.", nonce };
  const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (e2) {
    await audit(null, { action: "mfa_failed" });
    return { step: "mfa", factorId, error: "That code didn't work. Try the next one.", nonce };
  }
  const admin = await getAdmin();
  if (!admin) return { step: "credentials", error: GENERIC, nonce };
  await finishLogin(admin.id, admin.email, admin.email, null);
  return { step: "done", next: "/admin", mustChange: admin.mustChangePassword };
}

async function finishLogin(userId: string, email: string, attemptEmail: string, ip: string | null) {
  await recordLogin(attemptEmail, ip, true);
  const admin = await getAdmin();
  await audit(admin, { action: "login" });
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) await createServiceClient().from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  void email;
}

export async function requestReset(_prev: { ok?: boolean; error?: string } | null, form: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  // Always answer the same way so the form can't be used to discover which emails are admins.
  if (email.success && supabaseConfigured && !demoMode) {
    await (await createClient()).auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl}/admin/auth/callback?next=/admin/change-password` });
  }
  return { ok: true };
}
