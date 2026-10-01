import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const WINDOW_MS = 15 * 60_000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 25;

// Fallback when no service-role key is configured (local dev). Persisted in the DB otherwise.
const mem = new Map<string, number[]>();
const memHits = (k: string) => (mem.get(k) ?? []).filter((t) => Date.now() - t < WINDOW_MS);

export type LoginGate = { locked: boolean; delayMs: number; retryInMin: number };

export async function loginGate(email: string, ip: string | null): Promise<LoginGate> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  let byEmail = 0, byIp = 0;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createServiceClient();
    const [a, b] = await Promise.all([
      sb.from("login_attempts").select("id", { count: "exact", head: true }).eq("email", email).eq("success", false).gte("created_at", since),
      ip ? sb.from("login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).eq("success", false).gte("created_at", since) : Promise.resolve({ count: 0 }),
    ]);
    byEmail = a.count ?? 0; byIp = b.count ?? 0;
  } else {
    byEmail = memHits(`e:${email}`).length; byIp = ip ? memHits(`i:${ip}`).length : 0;
  }
  return { locked: byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP, delayMs: Math.min(byEmail * 400, 3000), retryInMin: Math.ceil(WINDOW_MS / 60_000) };
}

export async function recordLogin(email: string, ip: string | null, success: boolean) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createServiceClient().from("login_attempts").insert({ email, ip, success });
    return;
  }
  if (!success) {
    mem.set(`e:${email}`, [...memHits(`e:${email}`), Date.now()]);
    if (ip) mem.set(`i:${ip}`, [...memHits(`i:${ip}`), Date.now()]);
  } else mem.delete(`e:${email}`);
}
