import "server-only";
import { getDb, type Row } from "./db";
import { daysUntil } from "@/lib/utils";

const count = (rows: Row[], key: string) => {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = String(r[key] ?? "—"); m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

export async function getDashboard() {
  const db = await getDb();
  const all = async (t: string, soft = true) => (await db.list(t, { softDelete: soft, limit: 5000 })).rows;
  const [clients, subs, payments, leads, backups, tickets, devices, activity] = await Promise.all([
    all("clients"), all("subscriptions", false), all("payments", false), all("leads"), all("backups", false), all("support_requests"), all("devices"),
    db.list("audit_log", { order: { col: "created_at", asc: false }, limit: 8 }).then((r) => r.rows),
  ]);

  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 0 + 1); return { key: monthKey(d), label: d.toLocaleString("en-IN", { month: "short" }), value: 0 }; });
  payments.forEach((p) => { const m = months.find((x) => x.key === String(p.paid_on).slice(0, 7)); if (m) m.value += Number(p.amount); });

  const clientName = new Map(clients.map((c) => [c.id, c.business_name as string]));
  const expiring = subs
    .map((s) => ({ client_id: s.client_id as string, name: clientName.get(s.client_id) ?? "Client", days: daysUntil(s.free_period_end), end: s.free_period_end as string }))
    .filter((s) => s.days !== null && s.days >= 0 && s.days <= 60)
    .sort((a, b) => a.days! - b.days!)
    .slice(0, 6);

  const week = Date.now() - 7 * 86_400_000;
  const funnelOrder = ["new", "contacted", "demo_booked", "proposal", "won", "lost"];
  const leadCounts = Object.fromEntries(count(leads, "status").map((x) => [x.label, x.value]));

  return {
    kpis: {
      activeClients: clients.filter((c) => c.status === "active").length,
      freePeriodClients: subs.filter((s) => (daysUntil(s.free_period_end) ?? -1) >= 0).length,
      revenueMonth: months.at(-1)?.value ?? 0,
      outstanding: subs.reduce((n, s) => n + Number(s.amount_due ?? 0), 0),
      newLeads7d: leads.filter((l) => new Date(l.created_at).getTime() > week).length,
      renewals30d: subs.filter((s) => { const d = daysUntil(s.next_billing_date); return d !== null && d >= 0 && d <= 30; }).length,
      backupsOverdue: backups.filter((b) => b.status === "overdue").length,
      ticketsOpen: tickets.filter((t) => ["open", "in_progress", "waiting"].includes(t.status)).length,
    },
    funnel: funnelOrder.map((s) => ({ label: s.replace("_", " "), value: leadCounts[s] ?? 0 })),
    revenue: months,
    byCity: count(clients, "city").slice(0, 6),
    byType: count(clients, "business_type").slice(0, 6),
    devicesByType: Object.entries(devices.reduce<Record<string, number>>((m, d) => { m[d.device_type] = (m[d.device_type] ?? 0) + Number(d.quantity ?? 1); return m; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
    expiring,
    activity,
  };
}
