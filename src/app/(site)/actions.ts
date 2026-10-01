"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number"),
  business_name: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  business_type: z.enum(["cafe", "restaurant", "hotel", "bakery", "bar", "other"]).optional(),
  message: z.string().trim().max(2000).optional(),
  plan_interest: z.string().trim().max(60).optional(),
  coupon_code: z.string().trim().max(40).optional(),
  website: z.string().max(0).optional(), // honeypot — real users leave this empty
  utm: z.string().max(600).optional(),
});

export type LeadState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

// Best-effort per-instance limiter (the DB insert policy also validates). Swap for Redis/Upstash when scaling out.
const hits = new Map<string, number[]>();
function limited(key: string, max = 4, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

export async function submitLead(_prev: LeadState, form: FormData): Promise<LeadState> {
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" && v !== "" ? v : undefined]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => { errors[String(i.path[0])] = i.message; });
    return { ok: false, message: "Please check the highlighted fields.", errors };
  }
  if (parsed.data.website) return { ok: true, message: "Thanks! We'll call you shortly." }; // bot: pretend success

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return { ok: false, message: "Too many requests — please try again in a few minutes." };

  if (!supabaseConfigured) return { ok: false, message: "Lead capture isn't connected yet. Please contact us on WhatsApp." };

  const { website: _hp, utm, ...lead } = parsed.data;
  let utmObj: Record<string, string> = {};
  try { utmObj = utm ? JSON.parse(utm) : {}; } catch { /* ignore malformed utm */ }

  const { error } = await createPublicClient().from("leads").insert({ ...lead, source: "website", utm: utmObj });
  if (error) return { ok: false, message: "Something went wrong. Please try again or WhatsApp us." };
  return { ok: true, message: "Thanks! We'll call you shortly." };
}
