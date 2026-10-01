import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { can } from "@/lib/admin/roles";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Audit Log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; action?: string }> }) {
  const admin = await getAdmin();
  if (!admin || !can.readAudit(admin.role)) redirect("/admin");
  const { q = "", action = "" } = await searchParams;
  const { rows } = await (await getDb()).list("audit_log", { q, searchCols: ["user_email", "entity", "action"], filters: { action }, order: { col: "created_at", asc: false }, limit: 200 });
  return (
    <>
      <PageHeader title="Audit Log" description="Every sign-in, publish, secret reveal and change. Entries can never be edited or deleted." />
      <form className="mb-4 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Search user, entity, action…" aria-label="Search" />
        <input name="action" defaultValue={action} className="input max-w-[12rem]" placeholder="Exact action (e.g. login)" aria-label="Action" />
        <button className="btn btn-ghost">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No entries" hint="Nothing matches yet." /> : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--fg-muted)]"><th className="px-4 py-3">When</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-b border-[var(--line)] last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                  <td>{r.user_email ?? "—"}</td>
                  <td><Badge value={r.action} tone={String(r.action).includes("fail") || String(r.action).includes("reveal") ? "warn" : "info"} /></td>
                  <td className="text-[var(--fg-muted)]">{r.entity ?? ""} {r.entity_id ? String(r.entity_id).slice(0, 8) : ""}</td>
                  <td className="text-[var(--fg-muted)]">{r.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
