"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { audit } from "@/lib/admin/audit";
import { can } from "@/lib/admin/roles";
import type { ActionResult } from "./actions";

const uuid = z.string().uuid();
const STAGES = ["Lead", "Demo", "Agreement", "Setup", "Training", "Go-live", "Support"];

const sub = z.object({
  plan_id: z.preprocess((v) => (v === "" ? null : v), uuid.nullable()),
  cycle: z.enum(["monthly", "yearly"]),
  list_price: z.coerce.number().min(0),
  discount_type: z.enum(["percent", "flat"]),
  discount_amount: z.coerce.number().min(0),
  discount_reason: z.string().max(200).nullable().optional(),
  free_period_months: z.coerce.number().int().min(0).max(60),
  free_period_start: z.preprocess((v) => (v === "" ? null : v), z.string().date().nullable()),
  free_period_end: z.preprocess((v) => (v === "" ? null : v), z.string().date().nullable()),
  total_amount: z.coerce.number().min(0),
  amount_paid: z.coerce.number().min(0),
  next_billing_date: z.preprocess((v) => (v === "" ? null : v), z.string().date().nullable()),
  renewal_reminder: z.boolean(),
}).refine((v) => v.discount_type !== "percent" || v.discount_amount <= 100, { message: "Percent discount can't exceed 100", path: ["discount_amount"] });

export async function saveSubscription(clientId: string, raw: Record<string, unknown>): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin || !can.writeBusiness(admin.role)) return { ok: false, error: "You don't have permission to change plans." };
  if (!uuid.safeParse(clientId).success) return { ok: false, error: "Invalid client." };
  const p = sub.safeParse(raw);
  if (!p.success) {
    const fieldErrors: Record<string, string> = {};
    p.error.issues.forEach((i) => { fieldErrors[String(i.path[0])] = i.message; });
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const db = await getDb();
  const existing = (await db.list("subscriptions", { filters: { client_id: clientId }, limit: 1 })).rows[0];
  // amount_due is a generated column in Postgres; the demo store has none, so compute it there.
  const data = { ...p.data, amount_due: Math.max(p.data.total_amount - p.data.amount_paid, 0) };
  const { amount_due, ...dbData } = data;
  try {
    if (existing) await db.update("subscriptions", existing.id, process.env.ADMIN_DEMO === "1" ? data : dbData);
    else await db.insert("subscriptions", { client_id: clientId, ...(process.env.ADMIN_DEMO === "1" ? data : dbData) });
    await audit(admin, { action: "update", entity: "subscriptions", entityId: clientId });
    revalidatePath(`/admin/clients/${clientId}`);
    void amount_due;
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function setClientStage(clientId: string, stage: string): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin || !can.writeBusiness(admin.role)) return { ok: false, error: "Not allowed" };
  if (!uuid.safeParse(clientId).success || !STAGES.includes(stage)) return { ok: false, error: "Invalid stage" };
  const db = await getDb();
  const patch: Record<string, unknown> = { onboarding_stage: stage };
  if (stage === "Go-live" || stage === "Support") patch.status = "active";
  await db.update("clients", clientId, patch);
  await db.insert("activities", { client_id: clientId, kind: "status_change", body: `Stage → ${stage}`, created_by: admin.demo ? null : admin.id });
  await audit(admin, { action: "stage_change", entity: "clients", entityId: clientId, meta: { stage } });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: null };
}

export async function addNote(clientId: string, kind: "note" | "call", body: string): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin || !can.writeSupport(admin.role)) return { ok: false, error: "Not allowed" };
  const text = body.trim();
  if (!uuid.safeParse(clientId).success || text.length < 1 || text.length > 4000) return { ok: false, error: "Write a note (max 4000 characters)." };
  await (await getDb()).insert("activities", { client_id: clientId, kind, body: text, created_by: admin.demo ? null : admin.id });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: null };
}
