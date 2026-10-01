import { getDb } from "@/lib/admin/db";
import { inr } from "@/lib/utils";
import { Card, PageHeader, Stat } from "@/components/admin/ui";
import { BarList } from "@/components/admin/Charts";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const db = await getDb();
  const [clients, subs, payments, leads] = await Promise.all([db.list("clients", { softDelete: true, limit: 5000 }), db.list("subscriptions", { limit: 5000 }), db.list("payments", { limit: 5000 }), db.list("leads", { softDelete: true, limit: 5000 })]);
  const won = leads.rows.filter((l) => l.status === "won").length;
  const sources = Object.entries(leads.rows.reduce<Record<string, number>>((m, l) => { const k = l.source ?? "unknown"; m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([label, value]) => ({ label, value }));
  return (
    <>
      <PageHeader title="Reports" description="Headline numbers across the business." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total clients" value={clients.rows.length} />
        <Stat label="Lifetime collected" value={inr(payments.rows.reduce((n, p) => n + Number(p.amount), 0))} />
        <Stat label="Outstanding" value={inr(subs.rows.reduce((n, s) => n + Number(s.amount_due ?? 0), 0))} tone="danger" />
        <Stat label="Lead → client rate" value={leads.rows.length ? `${Math.round((won / leads.rows.length) * 100)}%` : "—"} sub={`${won} won of ${leads.rows.length} leads`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Leads by source"><BarList rows={sources} /></Card>
      </div>
      <p className="mt-6 text-sm text-[var(--fg-muted)]">CSV export of clients: Stage 5 (Python service).</p>
    </>
  );
}
