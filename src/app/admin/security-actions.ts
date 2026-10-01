"use server";

import { getAdmin } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { createClient } from "@/lib/supabase/server";
import { demoMode } from "@/lib/env";
import type { ActionResult } from "./actions";

export async function getMfaStatus(): Promise<{ enrolled: boolean; available: boolean }> {
  if (demoMode || !(await getAdmin())) return { enrolled: false, available: false };
  const { data } = await (await createClient()).auth.mfa.listFactors();
  return { enrolled: !!data?.totp?.some((f) => f.status === "verified"), available: true };
}

export async function enrollTotp(): Promise<ActionResult<{ factorId: string; qr: string; secret: string }>> {
  const admin = await getAdmin();
  if (!admin || demoMode) return { ok: false, error: "Two-factor setup needs a real Supabase login." };
  const sb = await createClient();
  // remove any half-finished enrolment so the user can retry
  const { data: f } = await sb.auth.mfa.listFactors();
  for (const x of f?.all ?? []) if (x.status === "unverified") await sb.auth.mfa.unenroll({ factorId: x.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
  if (error || !data) return { ok: false, error: "Could not start enrolment. Is MFA enabled in your Supabase project?" };
  return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}

export async function confirmTotp(factorId: string, code: string): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not signed in" };
  const sb = await createClient();
  const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
  if (e1 || !ch) return { ok: false, error: "Could not verify. Try again." };
  const { error } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.replace(/\s/g, "") });
  if (error) return { ok: false, error: "That code didn't match. Check your phone's clock and try again." };
  await audit(admin, { action: "mfa_enrolled" });
  return { ok: true, data: null };
}

export async function disableTotp(): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin || demoMode) return { ok: false, error: "Not available" };
  const sb = await createClient();
  const { data } = await sb.auth.mfa.listFactors();
  for (const f of data?.totp ?? []) { const { error } = await sb.auth.mfa.unenroll({ factorId: f.id }); if (error) return { ok: false, error: "Re-verify with your code first (sign in again), then retry." }; }
  await audit(admin, { action: "mfa_disabled" });
  return { ok: true, data: null };
}
