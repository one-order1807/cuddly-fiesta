"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { demoMode } from "@/lib/env";
import type { ActionResult } from "./actions";

export type VaultItem = { id: string; label: string; username: string | null; url: string | null; notes: string | null; rotation_days: number; last_changed_at: string };

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Server-to-server call: the browser never sees the access token or the API URL's credentials.
 * (Session cookies are httpOnly, so this is the only place the JWT is read.)
 */
async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, status: 401, error: "Not signed in" };
  if (demoMode) return { ok: false, status: 503, error: "The vault needs a real Supabase login and the Python service (not available in demo mode)." };
  const { data } = await (await createClient()).auth.getSession();
  if (!data.session) return { ok: false, status: 401, error: "Session expired" };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""; // so the vault audit log records the admin's real IP
  try {
    const res = await fetch(`${API}${path}`, { ...init, cache: "no-store", headers: { ...init.headers, Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json", "X-Forwarded-For": ip, "User-Agent": h.get("user-agent") ?? "" } });
    if (res.status === 204) return { ok: true, data: null as T };
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: typeof body.detail === "string" ? body.detail : "Request failed" };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 502, error: "Can't reach the vault service. Is the Python backend running?" };
  }
}

const uuid = z.string().uuid();

export async function vaultList(clientId: string): Promise<ActionResult<VaultItem[]>> {
  if (!uuid.safeParse(clientId).success) return { ok: false, error: "Invalid client" };
  const r = await api<VaultItem[]>(`/vault?client_id=${clientId}`);
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(120), username: z.string().trim().max(200).optional(), url: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(), secret: z.string().min(1).max(4000), rotation_days: z.coerce.number().int().min(1).max(1825).default(90),
});

export async function vaultCreate(clientId: string, raw: Record<string, unknown>): Promise<ActionResult<null>> {
  const p = createSchema.safeParse(raw);
  if (!uuid.safeParse(clientId).success || !p.success) return { ok: false, error: "Label and secret are required." };
  const body = Object.fromEntries(Object.entries(p.data).filter(([, v]) => v !== "" && v !== undefined));
  const r = await api(`/vault`, { method: "POST", body: JSON.stringify({ ...body, client_id: clientId }) });
  return r.ok ? { ok: true, data: null } : { ok: false, error: r.error };
}

export async function vaultReveal(id: string, password: string): Promise<ActionResult<{ secret: string; expires_in: number }>> {
  if (!uuid.safeParse(id).success || !password) return { ok: false, error: "Enter your password." };
  const r = await api<{ secret: string; expires_in: number }>(`/vault/${id}/reveal`, { method: "POST", body: JSON.stringify({ password }) });
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.status === 401 ? "Password is incorrect." : r.status === 429 ? "Too many attempts — wait a minute." : r.error };
}

export async function vaultDelete(id: string): Promise<ActionResult<null>> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id" };
  const r = await api(`/vault/${id}`, { method: "DELETE" });
  return r.ok ? { ok: true, data: null } : { ok: false, error: r.error };
}
