import Link from "next/link";
import { Plus, Star, Tag, UploadCloud } from "lucide-react";
import { getDashboard } from "@/lib/admin/dashboard";
import { getAdmin } from "@/lib/admin/session";
import { Card, PageHeader } from "@/components/admin/ui";
import { BarList, CountUp, LiveRefresh, RevenueChart } from "@/components/admin/Charts";

export const metadata = { title: "Dashboard" };

function Kpi({ label, value, money, tone, href }: { label: string; value: number; money?: boolean; tone?: "danger"; href: string }) {
  return (
    <Link href={href} className="glass group rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{label}</p>
      <p className={`serif mt-2 text-4xl leading-none tabular-nums ${tone === "danger" && value > 0 ? "text-[var(--danger)]" : ""}`}><CountUp value={value} money={money} /></p>
    </Link>
  );
}

export default async function Dashboard() {
  const [d, admin] = await Promise.all([getDashboard(), getAdmin()]);
  const k = d.kpis;
  return (
    <>
      <LiveRefresh />
      <PageHeader title={`Welcome, ${admin?.name.split(" ")[0] ?? "there"}`} description="Your business at a glance." />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/clients?new=1" className="btn btn-primary"><Plus size={16} /> Add client</Link>
        <Link href="/admin/cms/testimonials?new=1" className="btn btn-ghost"><Star size={16} /> Add review</Link>
        <Link href="/admin/cms/offers?new=1" className="btn btn-ghost"><Tag size={16} /> Create offer</Link>
        <Link href="/admin/cms" className="btn btn-ghost"><UploadCloud size={16} /> Publish site</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Active clients" value={k.activeClients} href="/admin/clients" />
        <Kpi label="Free-period clients" value={k.freePeriodClients} href="/admin/clients" />
        <Kpi label="Revenue this month" value={k.revenueMonth} money href="/admin/billing" />
        <Kpi label="Outstanding dues" value={k.outstanding} money tone="danger" href="/admin/billing" />
        <Kpi label="New leads (7d)" value={k.newLeads7d} href="/admin/leads" />
        <Kpi label="Renewals (30d)" value={k.renewals30d} href="/admin/clients" />
        <Kpi label="Backups overdue" value={k.backupsOverdue} tone="danger" href="/admin/backups" />
        <Kpi label="Open tickets" value={k.ticketsOpen} href="/admin/support" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Revenue — last 6 months" className="lg:col-span-2"><RevenueChart data={d.revenue} /></Card>
        <Card title="Free periods ending soon">
          {d.expiring.length === 0 ? <p className="py-6 text-center text-sm text-[var(--fg-muted)]">Nothing expires in the next 60 days.</p> : (
            <ul className="divide-y divide-[var(--line)]">
              {d.expiring.map((e) => (
                <li key={e.client_id}><Link href={`/admin/clients/${e.client_id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-[var(--primary)]"><span className="truncate">{e.name}</span><span className={`ml-3 shrink-0 text-xs font-semibold ${e.days! <= 7 ? "text-[var(--danger)]" : "text-[var(--fg-muted)]"}`}>{e.days === 0 ? "today" : `${e.days}d left`}</span></Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Leads funnel"><BarList rows={d.funnel} /></Card>
        <Card title="Clients by city"><BarList rows={d.byCity} empty="Add clients to see cities" /></Card>
        <Card title="Clients by business type"><BarList rows={d.byType} empty="Add clients to see types" /></Card>
        <Card title="Devices by type"><BarList rows={d.devicesByType} empty="No devices recorded yet" /></Card>
        <Card title="Recent activity" className="lg:col-span-2">
          {d.activity.length === 0 ? <p className="py-6 text-center text-sm text-[var(--fg-muted)]">Activity will appear here.</p> : (
            <ul className="space-y-2 text-sm">
              {d.activity.map((a) => <li key={String(a.id)} className="flex justify-between gap-3"><span><b className="capitalize">{String(a.action).replace(/_/g, " ")}</b> <span className="text-[var(--fg-muted)]">{a.entity ?? ""} {a.user_email ? `· ${a.user_email}` : ""}</span></span><time className="shrink-0 text-xs text-[var(--fg-muted)]">{new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
