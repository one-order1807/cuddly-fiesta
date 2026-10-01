import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, crumbs, actions }: { title: string; description?: string; crumbs?: { label: string; href?: string }[]; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-[var(--fg-muted)]">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.href ? <Link href={c.href} className="hover:text-[var(--primary)]">{c.label}</Link> : <span>{c.label}</span>}
                {i < crumbs.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="serif text-4xl leading-none sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-[var(--fg-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  published: "ok", active: "ok", won: "ok", paid: "ok", resolved: "ok", released: "ok", ok: "ok", passing: "ok", stable: "info", closed: "muted",
  draft: "muted", pending: "warn", new: "info", contacted: "info", onboarding: "info", demo_booked: "info", open: "info", in_progress: "info", proposal: "warn", waiting: "warn", beta: "warn", normal: "muted", low: "muted", sent: "info",
  high: "warn", urgent: "danger", lost: "danger", churned: "danger", overdue: "danger", failed: "danger", withdrawn: "danger", archived: "muted", paused: "warn", lead: "info", unknown: "muted", website: "info",
};
const TONE_CLASS: Record<string, string> = {
  ok: "bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] text-[color-mix(in_srgb,var(--ok)_80%,var(--fg))]",
  info: "bg-[var(--primary-soft)] text-[var(--primary)]",
  warn: "bg-[color-mix(in_srgb,var(--amber)_20%,transparent)] text-[color-mix(in_srgb,var(--amber)_70%,var(--fg))]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]",
  muted: "bg-[var(--line)] text-[var(--fg-muted)]",
};

export function Badge({ value, tone }: { value: string; tone?: keyof typeof TONE_CLASS }) {
  const t = tone ?? TONES[value.toLowerCase()] ?? "muted";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", TONE_CLASS[t])}>{value.replace(/_/g, " ")}</span>;
}

export function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("glass rounded-2xl p-5", className)}>
      {(title || action) && <div className="mb-4 flex items-center justify-between gap-3">{title && <h2 className="text-sm font-semibold">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--line)] px-6 py-14 text-center">
      <p className="serif text-2xl">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[var(--fg-muted)]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "danger" | "ok" | "warn" }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{label}</p>
      <p className={cn("serif mt-2 text-4xl tabular-nums leading-none", tone === "danger" && "text-[var(--danger)]", tone === "ok" && "text-[var(--ok)]")}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--fg-muted)]">{sub}</p>}
    </div>
  );
}
