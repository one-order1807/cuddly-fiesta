"use server";

import { z } from "zod";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { audit } from "@/lib/admin/audit";
import { can } from "@/lib/admin/roles";
import type { ActionResult } from "./actions";

const KEYS = ["contact", "brand", "social", "announcement", "analytics"] as const;
// Values are free-form JSON written by trusted admins, but bound the size and shape to keep rows sane.
const value = z.record(z.string().max(60), z.union([z.string().max(2000), z.number(), z.boolean(), z.array(z.string().max(200)).max(50), z.null()])).refine((v) => JSON.stringify(v).length < 20_000, "Too large");

export async function saveSetting(key: string, raw: Record<string, unknown>): Promise<ActionResult<null>> {
  const admin = await getAdmin();
  if (!admin || !can.writeBusiness(admin.role)) return { ok: false, error: "You don't have permission to change settings." };
  if (!(KEYS as readonly string[]).includes(key)) return { ok: false, error: "Unknown settings group." };
  const parsed = value.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "" && v !== undefined)));
  if (!parsed.success) return { ok: false, error: "Some values are invalid." };

  const db = await getDb();
  const existing = await db.get("site_settings", key, "key");
  const payload = { value: parsed.data, updated_by: admin.demo ? null : admin.id, updated_at: new Date().toISOString() };
  if (existing) await db.update("site_settings", key, payload, "key"); else await db.insert("site_settings", { key, ...payload });
  await audit(admin, { action: "update", entity: "site_settings", entityId: key });
  return { ok: true, data: null };
}
