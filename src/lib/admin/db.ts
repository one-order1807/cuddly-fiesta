import "server-only";
import { demoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoSeed } from "./demo-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export type ListOpts = {
  q?: string;
  searchCols?: string[];
  filters?: Record<string, string | number | boolean | null | undefined>;
  order?: { col: string; asc?: boolean };
  limit?: number;
  offset?: number;
  softDelete?: boolean; // hide rows where deleted_at is set
};

export interface Db {
  list(table: string, opts?: ListOpts): Promise<{ rows: Row[]; count: number }>;
  get(table: string, id: string, idCol?: string): Promise<Row | null>;
  insert(table: string, values: Row): Promise<Row>;
  update(table: string, id: string, values: Row, idCol?: string): Promise<Row>;
  remove(table: string, id: string, soft: boolean, idCol?: string): Promise<void>;
  restore(table: string, id: string, idCol?: string): Promise<void>;
}

/* ---------- Supabase (RLS applies as the signed-in admin) ---------- */
async function supabaseDb(): Promise<Db> {
  const sb = await createClient();
  const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

  return {
    async list(table, o = {}) {
      let q = sb.from(table).select("*", { count: "exact" });
      if (o.softDelete) q = q.is("deleted_at", null);
      for (const [k, v] of Object.entries(o.filters ?? {})) if (v !== undefined && v !== "") q = v === null ? q.is(k, null) : q.eq(k, v);
      if (o.q && o.searchCols?.length) {
        const safe = o.q.replace(/[,()%*\\]/g, " ").trim();
        if (safe) q = q.or(o.searchCols.map((c) => `${c}.ilike.%${safe}%`).join(","));
      }
      if (o.order) q = q.order(o.order.col, { ascending: o.order.asc ?? true });
      if (o.limit) q = q.range(o.offset ?? 0, (o.offset ?? 0) + o.limit - 1);
      const { data, error, count } = await q;
      fail(error);
      return { rows: (data ?? []) as Row[], count: count ?? data?.length ?? 0 };
    },
    async get(table, id, idCol = "id") {
      const { data, error } = await sb.from(table).select("*").eq(idCol, id).maybeSingle();
      fail(error);
      return (data as Row) ?? null;
    },
    async insert(table, values) {
      const { data, error } = await sb.from(table).insert(values).select().single();
      fail(error);
      return data as Row;
    },
    async update(table, id, values, idCol = "id") {
      const { data, error } = await sb.from(table).update(values).eq(idCol, id).select().single();
      fail(error);
      return data as Row;
    },
    async remove(table, id, soft, idCol = "id") {
      const { error } = soft ? await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq(idCol, id) : await sb.from(table).delete().eq(idCol, id);
      fail(error);
    },
    async restore(table, id, idCol = "id") {
      const { error } = await sb.from(table).update({ deleted_at: null }).eq(idCol, id);
      fail(error);
    },
  };
}

/* ---------- Dev-only in-memory store (ADMIN_DEMO=1) so the UI is explorable before Supabase is connected ---------- */
type Store = Record<string, Row[]>;
const g = globalThis as unknown as { __ooDemo?: Store };

function demoDb(): Db {
  g.__ooDemo ??= demoSeed();
  const store = g.__ooDemo;
  const tbl = (t: string) => (store[t] ??= []);
  const pk = (t: string) => (t === "site_settings" ? "key" : t === "seo_pages" ? "path" : "id");

  return {
    async list(table, o = {}) {
      let rows = [...tbl(table)];
      if (o.softDelete) rows = rows.filter((r) => !r.deleted_at);
      for (const [k, v] of Object.entries(o.filters ?? {})) if (v !== undefined && v !== "") rows = rows.filter((r) => (r[k] ?? null) === v);
      if (o.q && o.searchCols?.length) {
        const needle = o.q.toLowerCase();
        rows = rows.filter((r) => o.searchCols!.some((c) => String(r[c] ?? "").toLowerCase().includes(needle)));
      }
      if (o.order) {
        const { col, asc = true } = o.order;
        rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      const count = rows.length;
      if (o.limit) rows = rows.slice(o.offset ?? 0, (o.offset ?? 0) + o.limit);
      return { rows: structuredClone(rows), count };
    },
    async get(table, id, idCol = pk(table)) {
      const r = tbl(table).find((x) => x[idCol] === id);
      return r ? structuredClone(r) : null;
    },
    async insert(table, values) {
      const now = new Date().toISOString();
      const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...values };
      tbl(table).push(row);
      return structuredClone(row);
    },
    async update(table, id, values, idCol = pk(table)) {
      const r = tbl(table).find((x) => x[idCol] === id);
      if (!r) throw new Error("Row not found");
      Object.assign(r, values, { updated_at: new Date().toISOString() });
      return structuredClone(r);
    },
    async remove(table, id, soft, idCol = pk(table)) {
      const rows = tbl(table);
      const i = rows.findIndex((x) => x[idCol] === id);
      if (i < 0) return;
      if (soft) rows[i].deleted_at = new Date().toISOString();
      else rows.splice(i, 1);
    },
    async restore(table, id, idCol = pk(table)) {
      const r = tbl(table).find((x) => x[idCol] === id);
      if (r) r.deleted_at = null;
    },
  };
}

export async function getDb(): Promise<Db> {
  return demoMode ? demoDb() : supabaseDb();
}
