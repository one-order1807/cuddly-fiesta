import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../supabase", import.meta.url));
const db = new PGlite();
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };

// --- minimal Supabase stubs ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  grant usage on schema public, auth to anon, authenticated;
`);

for (const f of ["0001_core.sql", "0002_clients.sql", "0003_cms.sql", "0004_rls_storage.sql"]) {
  try { await db.exec(fs.readFileSync(`${dir}/migrations/${f}`, "utf8")); ok(true, `migration ${f} applied`); }
  catch (e) { ok(false, `migration ${f}: ${e.message}`); process.exit(1); }
}
try { await db.exec(fs.readFileSync(`${dir}/seed.sql`, "utf8")); ok(true, "seed.sql applied"); } catch (e) { ok(false, "seed: " + e.message); process.exit(1); }

await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated; grant usage on all sequences in schema public to anon, authenticated;`);

const as = async (role, sub, sql) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  try { return await db.query(sql); } finally { await db.exec("reset role"); }
};
const fails = async (role, sub, sql) => { try { await as(role, sub, sql); return false; } catch { return true; } };

const owner = "11111111-1111-1111-1111-111111111111", viewer = "22222222-2222-2222-2222-222222222222", support = "33333333-3333-3333-3333-333333333333";
await db.exec(`
  insert into auth.users(id,email) values ('${owner}','o@x.in'),('${viewer}','v@x.in'),('${support}','s@x.in');
  insert into admin_users(id,email,role) values ('${owner}','o@x.in','owner'),('${viewer}','v@x.in','viewer'),('${support}','s@x.in','support');
`);

await db.exec(`insert into clients(business_name) values ('Seed Cafe');
  insert into credentials(label,secret_ciphertext,secret_nonce) values ('x', '\\x00'::bytea, '\\x00'::bytea);
  insert into audit_log(action,user_id) values ('seed','${owner}');
  insert into leads(name,phone) values ('Seed Lead','+91 99999 99999');`);
const hidden = async (role, sub, sql) => (await as(role, sub, sql)).rows.length === 0;
// --- public (anon) surface ---
let r = await as("anon", null, "select slug from v_public_plans");
ok(r.rows.length === 3, "anon sees the 3 published plans via v_public_plans");
ok(await hidden("anon", null, "select * from plans"), "anon cannot read plans table directly");
ok(await hidden("anon", null, "select * from clients"), "anon cannot read clients");
ok(await hidden("anon", null, "select * from credentials"), "anon cannot read credentials");
ok(await hidden("anon", null, "select * from audit_log"), "anon cannot read audit_log");
await db.exec("update plans set status='draft' where slug='pro'");
r = await as("anon", null, "select slug from v_public_plans");
ok(r.rows.length === 2, "drafting a plan hides it from the public view");
await db.exec("update plans set status='published', publish_at = now() + interval '1 day' where slug='pro'");
r = await as("anon", null, "select slug from v_public_plans");
ok(r.rows.length === 2, "scheduled-in-future plan stays hidden until publish_at");

// anon inserts
await as("anon", null, "insert into leads(name,phone) values ('Test Lead','+91 98765 43210')");
ok(true, "anon can submit a lead");
ok(await fails("anon", null, "insert into leads(name,phone,status) values ('Hax','+91 98765 43210','won')"), "anon cannot set lead status");
ok(await fails("anon", null, "insert into leads(name,phone) values ('X','1')"), "anon lead validation rejects short name/phone");
ok(await hidden("anon", null, "select * from leads"), "anon cannot read leads");
await as("anon", null, "insert into testimonials(customer_name,rating,status) values ('Guest',5,'pending')");
ok(await fails("anon", null, "insert into testimonials(customer_name,rating,status) values ('Guest',5,'published')"), "anon cannot self-publish a review");

// --- role enforcement ---
r = await as("authenticated", viewer, "select count(*)::int c from clients");
ok(r.rows[0].c === 1, "viewer can read clients");
ok(await fails("authenticated", viewer, "insert into clients(business_name) values ('Nope')"), "viewer cannot write clients");
await as("authenticated", owner, "insert into clients(business_name) values ('Owner Cafe')");
ok(true, "owner can write clients");
ok(await fails("authenticated", support, "insert into clients(business_name) values ('Support Cafe')"), "support cannot create clients");
await as("authenticated", support, "insert into support_requests(subject) values ('Printer')");
ok(true, "support can write tickets");
ok(await hidden("authenticated", owner, "select * from credentials"), "even owner cannot read credentials via the API (service role only)");
ok(await fails("authenticated", viewer, "insert into audit_log(action,user_id) values ('x','" + owner + "')"), "cannot forge audit entries for another user");
await as("authenticated", owner, `insert into audit_log(action,user_id) values ('test','${owner}')`);
ok((await as("authenticated", owner, "update audit_log set action='edited' returning id")).rows.length === 0, "audit_log cannot be updated (RLS: no policy)");
let tried = false; try { await db.exec("update audit_log set action='edited'"); } catch { tried = true; }
ok(tried, "audit_log cannot be updated even by a superuser (trigger)");
ok(await fails("authenticated", support, "insert into invoices(client_id,total) select id,1 from clients limit 1"), "support cannot create invoices");

// --- features ---
await as("authenticated", owner, "update plans set price_monthly = 555 where slug='starter'");
r = await db.query("select count(*)::int c from content_versions where entity='plans'");
ok(r.rows[0].c >= 1, "editing a plan snapshots a version");
r = await db.query("select search is not null as s from clients limit 1");
ok(r.rows[0].s, "client full-text search column populated");
await as("authenticated", owner, "insert into clients(business_name, phone) values ('A','+91 1111111111')");
ok(await fails("authenticated", owner, "insert into clients(business_name, phone) values ('B','+91 1111111111')"), "duplicate client phone rejected by unique index");
await db.exec(`insert into subscriptions(client_id,total_amount,amount_paid) select id,1000,400 from clients limit 1`);
r = await db.query("select amount_due from subscriptions limit 1");
ok(Number(r.rows[0].amount_due) === 600, "amount_due is computed (1000 - 400 = 600)");
console.log("done");
