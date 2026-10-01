import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdmin } from "@/lib/admin/session";
import { getDb, type Row } from "@/lib/admin/db";
import { RESOURCES } from "@/lib/admin/resources";
import { can } from "@/lib/admin/roles";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import ResourcePage from "@/components/admin/ResourcePage";
import VaultPanel from "@/components/admin/client/VaultPanel";
import PlanForm from "@/components/admin/client/PlanForm";
import { ContactButtons, EditClientButton, NoteBox, StagePipeline } from "@/components/admin/client/ClientBits";
import type { ClientResource } from "@/components/admin/ResourceManager";
import { daysUntil, inr } from "@/lib/utils";

const TABS = [
  ["overview", "Overview"], ["onboarding", "Onboarding"], ["plan", "Plan & Free period"], ["devices", "Devices"],
  ["project", "Project & Repo"], ["backend", "Backend & Backup"], ["app", "App & Version"], ["vault", "Credentials"],
  ["billing", "Billing"], ["timeline", "Timeline"],
] as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await (await getDb()).get("clients", id);
  return { title: c?.business_name ?? "Client" };
}

export default async function ClientProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: t }] = await Promise.all([params, searchParams]);
  const admin = await getAdmin();
  const db = await getDb();
  const client = await db.get("clients", id);
  if (!client || client.deleted_at) notFound();
  const tab = TABS.some(([k]) => k === t) ? t! : "overview";
  const canWrite = !!admin && can.writeBusiness(admin.role);
  const scope = { col: "client_id", value: id };

  const { write: _w, ...rest } = RESOURCES.clients;
  const clientRes: ClientResource = { ...rest, canWrite };
  const users = (await db.list("admin_users", { limit: 100 })).rows;
  const refs = { assigned_to: users.map((u) => ({ value: u.id, label: u.full_name || u.email })) };

  return (
    <>
      <PageHeader
        title={client.business_name}
        crumbs={[{ label: "Clients", href: "/admin/clients" }, { label: client.business_name }]}
        description={[client.owner_name, client.city, client.business_type].filter(Boolean).join(" · ")}
        actions={canWrite ? <EditClientButton resource={clientRes} client={client} refs={refs} /> : undefined}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {client.logo_url && <img src={client.logo_url} alt={`${client.business_name} logo`} className="h-12 w-12 rounded-xl object-cover" />}
        <Badge value={client.status} />
        <ContactButtons client={client} />
      </div>

      <div className="no-scrollbar -mx-1 mb-5 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Client sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/clients/${id}?tab=${k}`} role="tab" aria-selected={tab === k}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-[var(--primary)] text-white" : "text-[var(--fg-muted)] hover:bg-[var(--primary-soft)]"}`}>{label}</Link>
        ))}
      </div>

      <Suspense fallback={<div className="skeleton h-64" />}>
        {tab === "overview" && <Overview client={client} id={id} />}
        {tab === "onboarding" && <Onboarding client={client} id={id} canWrite={canWrite} scope={scope} />}
        {tab === "plan" && <Plan id={id} canWrite={canWrite} />}
        {tab === "devices" && <Devices id={id} scope={scope} />}
        {tab === "project" && <><ResourcePage resourceKey="repos" noHeader embedded scope={scope} /><p className="mt-3 text-xs text-[var(--fg-muted)]">Multiple repos per client are fine. Automatic GitHub sync arrives with the backend service (Stage 3).</p></>}
        {tab === "backend" && <div className="space-y-8"><Section title="Backend & deployment"><ResourcePage resourceKey="deployments" noHeader embedded scope={scope} /></Section><Section title="Backups"><ResourcePage resourceKey="backups" noHeader embedded scope={scope} /></Section></div>}
        {tab === "app" && <ResourcePage resourceKey="client_apps" noHeader embedded scope={scope} />}
        {tab === "vault" && <VaultPanel clientId={id} canReveal={!!admin && can.revealVault(admin.role)} canWrite={canWrite} />}
        {tab === "billing" && <div className="space-y-8"><Section title="Invoices"><ResourcePage resourceKey="invoices" noHeader embedded scope={scope} /></Section><Section title="Payments"><ResourcePage resourceKey="payments" noHeader embedded scope={scope} /></Section></div>}
        {tab === "timeline" && <Timeline id={id} canNote={!!admin && can.writeSupport(admin.role)} />}
      </Suspense>
    </>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</section>;
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => <div><dt className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{label}</dt><dd className="mt-1 text-sm">{children || "—"}</dd></div>;

async function Overview({ client, id }: { client: Row; id: string }) {
  const db = await getDb();
  const [sub] = (await db.list("subscriptions", { filters: { client_id: id }, limit: 1 })).rows;
  const devices = (await db.list("devices", { filters: { client_id: id }, softDelete: true })).rows;
  const left = daysUntil(sub?.free_period_end);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Business" className="lg:col-span-2">
        <dl className="grid gap-5 sm:grid-cols-3">
          <Fact label="Owner">{client.owner_name}</Fact><Fact label="Phone">{client.phone}</Fact><Fact label="WhatsApp">{client.whatsapp}</Fact>
          <Fact label="Email">{client.email}</Fact><Fact label="City">{client.city}</Fact><Fact label="GST">{client.gst_number}</Fact>
          <Fact label="Source">{client.source}</Fact><Fact label="Go-live">{client.go_live_date}</Fact><Fact label="Stage">{client.onboarding_stage}</Fact>
          <div className="sm:col-span-3"><Fact label="Address">{client.address}</Fact></div>
          <div className="sm:col-span-3"><Fact label="Tags">{client.tags?.length ? <span className="flex flex-wrap gap-1">{client.tags.map((x: string) => <span key={x} className="chip">{x}</span>)}</span> : null}</Fact></div>
          <div className="sm:col-span-3"><Fact label="Notes"><span className="whitespace-pre-wrap">{client.notes}</span></Fact></div>
        </dl>
      </Card>
      <div className="space-y-4">
        <Card title="Subscription">
          {sub ? (<>
            {left === null ? <Badge value="no free period" tone="muted" /> : left >= 0 ? <Badge value={`Free period — ${left} days left`} tone={left <= 7 ? "warn" : "ok"} /> : <Badge value="Free period ended" tone="danger" />}
            <dl className="mt-3 space-y-1.5 text-sm"><div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Free until</dt><dd>{sub.free_period_end ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Next billing</dt><dd>{sub.next_billing_date ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Due</dt><dd className="font-semibold tabular-nums">{inr(sub.amount_due)}</dd></div></dl>
          </>) : <p className="text-sm text-[var(--fg-muted)]">No plan yet.</p>}
        </Card>
        <Card title="Devices"><p className="serif text-4xl tabular-nums">{devices.reduce((n, d) => n + Number(d.quantity ?? 1), 0)}</p><p className="mt-1 text-xs text-[var(--fg-muted)]">{[...new Set(devices.map((d) => d.device_type))].join(", ") || "None recorded"}</p></Card>
      </div>
    </div>
  );
}

async function Onboarding({ client, id, canWrite, scope }: { client: Row; id: string; canWrite: boolean; scope: { col: string; value: string } }) {
  const db = await getDb();
  const stages = (await db.list("onboarding_stages", { order: { col: "sort_order" } })).rows.map((s) => s.name as string);
  const tasks = (await db.list("onboarding_tasks", { filters: { client_id: id } })).rows;
  const pct = tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0;
  return (
    <div className="space-y-5">
      <Card title="Pipeline"><StagePipeline clientId={id} stages={stages.length ? stages : ["Lead", "Demo", "Agreement", "Setup", "Training", "Go-live", "Support"]} current={client.onboarding_stage} canWrite={canWrite} /></Card>
      <Card title={`Go-live checklist — ${pct}% complete`}>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} /></div>
        <ResourcePage resourceKey="onboarding_tasks" noHeader embedded scope={scope} />
      </Card>
    </div>
  );
}

async function Plan({ id, canWrite }: { id: string; canWrite: boolean }) {
  const db = await getDb();
  const [sub] = (await db.list("subscriptions", { filters: { client_id: id }, limit: 1 })).rows;
  const plans = (await db.list("plans", { softDelete: true, order: { col: "sort_order" } })).rows.map((p) => ({ value: p.id as string, label: p.name as string }));
  const { id: _i, client_id: _c, created_at: _a, updated_at: _u, amount_due: _d, ...init } = sub ?? {};
  return <PlanForm clientId={id} initial={init} plans={plans} canWrite={canWrite} />;
}

async function Devices({ id, scope }: { id: string; scope: { col: string; value: string } }) {
  const rows = (await (await getDb()).list("devices", { filters: { client_id: id }, softDelete: true })).rows;
  const byType = rows.reduce<Record<string, number>>((m, d) => { m[d.device_type] = (m[d.device_type] ?? 0) + Number(d.quantity ?? 1); return m; }, {});
  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><span className="chip !text-sm">Total devices: {total}</span>{Object.entries(byType).map(([k, n]) => <span key={k} className="chip !text-sm">{k}: {n}</span>)}</div>
      <ResourcePage resourceKey="devices" noHeader embedded scope={scope} />
    </div>
  );
}

async function Timeline({ id, canNote }: { id: string; canNote: boolean }) {
  const db = await getDb();
  const rows = (await db.list("activities", { filters: { client_id: id }, order: { col: "created_at", asc: false }, limit: 100 })).rows;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Card title="Timeline">
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--fg-muted)]">Nothing yet.</p> : (
          <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
            {rows.map((a) => (
              <li key={a.id}><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]"><Badge value={a.kind} tone="info" /><time>{new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{a.body}</p></li>
            ))}
          </ol>
        )}
      </Card>
      {canNote && <Card title="Add entry"><NoteBox clientId={id} /></Card>}
    </div>
  );
}
