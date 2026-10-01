import "server-only";
import { headers } from "next/headers";
import { demoMode } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { getDb } from "./db";
import type { AdminUser } from "./session";

export type AuditInput = {
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  email?: string; // for events with no session (failed login)
};

async function requestInfo() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

/** Never put secrets, passwords or tokens in `meta`. */
export async function audit(user: AdminUser | null, e: AuditInput) {
  try {
    const row = {
      user_id: user?.id ?? null,
      user_email: user?.email ?? e.email ?? null,
      action: e.action,
      entity: e.entity ?? null,
      entity_id: e.entityId ?? null,
      meta: e.meta ?? {},
      ...(await requestInfo()),
    };
    if (demoMode) return void (await (await getDb()).insert("audit_log", row));
    // Session-less events (failed login) need the service role; everything else goes through RLS as the user.
    if (!user) return void (await createServiceClient().from("audit_log").insert(row));
    await (await getDb()).insert("audit_log", row);
  } catch (err) {
    console.error("[audit] failed to write", e.action, err instanceof Error ? err.message : err);
  }
}
