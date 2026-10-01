"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, type AdminUser } from "@/lib/admin/session";
import { getDb, type Row } from "@/lib/admin/db";
import { audit } from "@/lib/admin/audit";
import { can } from "@/lib/admin/roles";
import { RESOURCES, buildSchema } from "@/lib/admin/resources";
import { attachClientNames } from "@/lib/admin/db-helpers";
import { createClient } from "@/lib/supabase/server";
import { demoMode, supabaseConfigured } from "@/lib/env";

export type ActionResult<T = Row> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireAdmin(): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

function resourceOr(key: string) {
  const r = RESOURCES[key];
  if (!r) throw new Error("Unknown resource");
  return r;
}

export type Scope = { col: string; value: string } | undefined;

function checkScope(r: ReturnType<typeof resourceOr>, scope: Scope) {
  if (r.scopeCol && scope && scope.col === r.scopeCol && /^[0-9a-f-]{36}$/i.test(scope.value)) return scope;
  return undefined;
}

export async function listResource(key: string, opts: { q?: string; status?: string; scope?: Scope } = {}) {
  const admin = await requireAdmin();
  const r = resourceOr(key);
  const db = await getDb();
  const res = await db.list(r.table, {
    q: opts.q, searchCols: r.searchCols, softDelete: r.soft, order: r.order, limit: 500,
    filters: { ...(r.statusFilter && opts.status ? { [r.statusFilter.col]: opts.status } : {}), ...(checkScope(r, opts.scope) ? { [r.scopeCol!]: opts.scope!.value } : {}) },
  });
  void admin;
  return attachClientNames(res.rows, r);
}

export async function saveResource(key: string, id: string | null, values: Record<string, unknown>, scope?: Scope): Promise<ActionResult> {
  const admin = await requireAdmin();
  const r = resourceOr(key);
  if (!r.write(admin.role)) return { ok: false, error: "You don't have permission to change this." };

  const parsed = buildSchema(r).safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => { fieldErrors[String(i.path[0] ?? "_")] = i.message; });
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const data: Row = { ...parsed.data };
  if (r.cms) data.updated_by = admin.demo ? null : admin.id;
  const sc = checkScope(r, scope);
  if (sc && !id) data[sc.col] = sc.value;
  if (id && r.scopeCol && !sc) delete data[r.scopeCol]; // a row never moves to another parent through the form // parent id comes from the server-validated scope, never from the form
  if (key === "repos" && !data.repo_name && typeof data.github_url === "string") data.repo_name = data.github_url.replace(/\/+$/, "").split("/").slice(-1)[0].replace(/\.git$/, "");
  if (key === "invoices" && !Number(data.total)) {
    const base = Number(data.subtotal ?? 0) - Number(data.discount ?? 0);
    data.total = Math.max(0, Math.round((base + (data.gst_enabled ? (base * Number(data.gst_percent ?? 0)) / 100 : 0)) * 100) / 100);
  }
  if (key === "onboarding_tasks") data.done_at = data.done ? new Date().toISOString() : null;
  const db = await getDb();
  try {
    const row = id ? await db.update(r.table, id, data) : await db.insert(r.table, data);
    if (key === "clients" && !id) await seedNewClient(db, row, admin);
    await audit(admin, { action: id ? "update" : "create", entity: r.table, entityId: String(row.id ?? row.key ?? "") });
    revalidatePath(`/admin/${key}`);
    if (sc) revalidatePath(`/admin/clients/${sc.value}`);
    return { ok: true, data: row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: /duplicate key|unique/i.test(msg) ? "That value is already used (it must be unique)." : msg };
  }
}

export async function deleteResource(key: string, id: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const r = resourceOr(key);
  if (!r.write(admin.role)) return { ok: false, error: "You don't have permission to delete this." };
  try {
    await (await getDb()).remove(r.table, id, r.soft);
    await audit(admin, { action: "delete", entity: r.table, entityId: id, meta: { soft: r.soft } });
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function restoreResource(key: string, id: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const r = resourceOr(key);
  if (!r.write(admin.role) || !r.soft) return { ok: false, error: "Not allowed" };
  await (await getDb()).restore(r.table, id);
  await audit(admin, { action: "restore", entity: r.table, entityId: id });
  return { ok: true, data: null };
}

export async function reorderResource(key: string, ids: string[]): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const r = resourceOr(key);
  if (!r.sortable || !r.write(admin.role)) return { ok: false, error: "Not allowed" };
  const db = await getDb();
  await Promise.all(ids.map((id, i) => db.update(r.table, id, { sort_order: i })));
  await audit(admin, { action: "reorder", entity: r.table, meta: { count: ids.length } });
  return { ok: true, data: null };
}

/** Push CMS changes live: refresh the public site cache (same app) and/or call a remote site's webhook. */
export async function publishSite(): Promise<ActionResult<{ at: string; via: string[] }>> {
  const admin = await requireAdmin();
  if (!can.publish(admin.role)) return { ok: false, error: "Only owners and managers can publish." };
  const via: string[] = [];

  revalidatePath("/", "layout");
  via.push("local cache");

  const remote = process.env.SITE_REVALIDATE_URL; // set when the website is a separate deployment
  if (remote) {
    const res = await fetch(remote, { method: "POST", headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET ?? "", "content-type": "application/json" }, body: JSON.stringify({ paths: ["/"] }) }).catch(() => null);
    if (!res?.ok) return { ok: false, error: "Website webhook did not accept the request (check SITE_REVALIDATE_URL / REVALIDATE_SECRET)." };
    via.push("website webhook");
  }
  await audit(admin, { action: "publish", meta: { via } });
  return { ok: true, data: { at: new Date().toISOString(), via } };
}

export async function getRefOptions(table: string, labelCol: string) {
  await requireAdmin();
  const allowed: Record<string, string> = { apps: "name", clients: "business_name", plans: "name", admin_users: "full_name" };
  if (allowed[table] !== labelCol) return [];
  const { rows } = await (await getDb()).list(table, { order: { col: labelCol }, limit: 500 });
  return rows.map((r) => ({ value: String(r.id), label: String(r[labelCol] ?? r.email ?? r.id) }));
}

export async function signOutAction() {
  const admin = await getAdmin();
  if (admin) await audit(admin, { action: "logout" });
  if (supabaseConfigured && !demoMode) await (await createClient()).auth.signOut();
  redirect("/admin/login");
}

export async function signOutEverywhereAction() {
  const admin = await getAdmin();
  if (admin) await audit(admin, { action: "logout_everywhere" });
  if (supabaseConfigured && !demoMode) await (await createClient()).auth.signOut({ scope: "global" });
  redirect("/admin/login");
}

const DEFAULT_CHECKLIST = ["Menu uploaded", "Tables created", "Printer paired", "Staff trained", "Test bill printed", "Go-live confirmed"];

/** A new client gets a 6-month free-period subscription and the standard go-live checklist. */
async function seedNewClient(db: Awaited<ReturnType<typeof getDb>>, client: Row, admin: AdminUser) {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 6);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  try {
    await db.insert("subscriptions", { client_id: client.id, free_period_months: 6, free_period_start: d(start), free_period_end: d(end), next_billing_date: d(end) });
    for (const [i, title] of DEFAULT_CHECKLIST.entries()) await db.insert("onboarding_tasks", { client_id: client.id, title, sort_order: i });
    await db.insert("activities", { client_id: client.id, kind: "note", body: "Client created", created_by: admin.demo ? null : admin.id });
  } catch (e) {
    console.error("[seedNewClient]", e instanceof Error ? e.message : e);
  }
}
