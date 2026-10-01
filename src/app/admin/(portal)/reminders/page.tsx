import { getDb } from "@/lib/admin/db";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { daysUntil } from "@/lib/utils";

export const metadata = { title: "Reminders" };

/** Live view of what needs attention, computed from your data. The scheduled daily job that writes/sends these ships with the Python service (Stage 5). */
export default async function RemindersPage() {
  const db = await getDb();
  const [subs, clients, backups, deployments, leads] = await Promise.all([
    db.list("subscriptions", { limit: 2000 }), db.list("clients", { softDelete: true, limit: 2000 }),
    db.list("backups", { limit: 2000 }), db.list("deployments", { limit: 2000 }), db.list("leads", { softDelete: true, limit: 2000 }),
  ]);
  const name = new Map(clients.rows.map((c) => [c.id, c.business_name as string]));
  type Item = { tone: "danger" | "warn" | "info"; kind: string; text: string; when: number };
  const items: Item[] = [];
  subs.rows.forEach((s) => {
    const d = daysUntil(s.free_period_end);
    if (d !== null && [30, 7, 1].some((x) => d <= x && d >= 0)) items.push({ tone: d <= 7 ? "danger" : "warn", kind: "Free period ending", text: `${name.get(s.client_id)} — ${d} day${d === 1 ? "" : "s"} left`, when: d });
    if (Number(s.amount_due) > 0 && (daysUntil(s.next_billing_date) ?? 1) <= 0) items.push({ tone: "danger", kind: "Payment due", text: `${name.get(s.client_id)} owes ₹${s.amount_due}`, when: -1 });
  });
  backups.rows.filter((b) => b.status === "overdue" || b.status === "failed").forEach((b) => items.push({ tone: "danger", kind: "Backup " + b.status, text: String(name.get(b.client_id)), when: -1 }));
  deployments.rows.forEach((x) => { const d = daysUntil(x.ssl_expires_on); if (d !== null && d <= 30) items.push({ tone: d <= 7 ? "danger" : "warn", kind: "SSL expiry", text: `${name.get(x.client_id)} — ${x.domain ?? ""} in ${d}d`, when: d }); });
  leads.rows.forEach((l) => { const d = daysUntil(l.follow_up_at); if (d !== null && d <= 0 && !["won", "lost"].includes(l.status)) items.push({ tone: "warn", kind: "Lead follow-up", text: `${l.name} (${l.phone})`, when: d }); });
  items.sort((a, b) => a.when - b.when);

  return (
    <>
      <PageHeader title="Reminders" description="Free periods ending (30/7/1 days), dues, overdue backups, SSL expiry and lead follow-ups." />
      {items.length === 0 ? <EmptyState title="All clear" hint="Nothing needs your attention right now." /> : (
        <ul className="space-y-2">{items.map((i, n) => <li key={n} className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3"><span className="text-sm"><b>{i.kind}</b> <span className="text-[var(--fg-muted)]">— {i.text}</span></span><Badge value={i.tone === "danger" ? "urgent" : "soon"} tone={i.tone} /></li>)}</ul>
      )}
    </>
  );
}
