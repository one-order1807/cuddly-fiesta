"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Field, Option } from "@/lib/admin/resources";
import { saveSubscription } from "@/app/admin/client-actions";
import { FieldInput } from "../FieldInputs";
import { Badge, Card } from "../ui";
import { daysUntil, inr } from "@/lib/utils";

const addMonths = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

export default function PlanForm({ clientId, initial, plans, canWrite }: { clientId: string; initial: Record<string, unknown>; plans: Option[]; canWrite: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, unknown>>({
    plan_id: "", cycle: "monthly", list_price: 0, discount_type: "percent", discount_amount: 0, discount_reason: "", free_period_months: 6,
    free_period_start: "", free_period_end: "", total_amount: 0, amount_paid: 0, next_billing_date: "", renewal_reminder: true, ...initial,
  });
  const [endTouched, setEndTouched] = useState(Boolean(initial.free_period_end));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: string, val: unknown) => setV((p) => {
    const n = { ...p, [k]: val };
    // auto-calc free-period end from start + months until the user edits the end date by hand
    if ((k === "free_period_start" || k === "free_period_months") && !endTouched && n.free_period_start) n.free_period_end = addMonths(String(n.free_period_start), Number(n.free_period_months) || 0);
    if (k === "free_period_end") setEndTouched(true);
    return n;
  });

  const f = (name: string, label: string, type: Field["type"], extra: Partial<Field> = {}): Field => ({ name, label, type, half: true, ...extra });
  const fields: Field[] = [
    f("plan_id", "Plan", "ref", { ref: { table: "plans", label: "name" } }),
    f("cycle", "Billing cycle", "select", { options: [{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }], required: true }),
    f("list_price", "List price (₹ per cycle)", "number", { min: 0 }),
    f("discount_type", "Discount type", "select", { options: [{ value: "percent", label: "Percent %" }, { value: "flat", label: "Flat ₹" }], required: true }),
    f("discount_amount", "Discount amount", "number", { min: 0 }),
    f("discount_reason", "Discount reason", "text"),
    f("free_period_months", "Free period (months)", "number", { min: 0, max: 60, help: "Default 6 months" }),
    f("free_period_start", "Free period start", "date"),
    f("free_period_end", "Free period end", "date", { help: "Auto-calculated — edit to override" }),
    f("next_billing_date", "Next billing date", "date"),
    f("total_amount", "Total amount (₹)", "number", { min: 0 }),
    f("amount_paid", "Amount paid (₹)", "number", { min: 0 }),
    f("renewal_reminder", "Renewal reminder", "bool"),
  ];

  const net = useMemo(() => {
    const list = Number(v.list_price) || 0, d = Number(v.discount_amount) || 0;
    return Math.max(0, v.discount_type === "percent" ? list - (list * d) / 100 : list - d);
  }, [v.list_price, v.discount_amount, v.discount_type]);
  const left = daysUntil(String(v.free_period_end || "") || null);
  const due = Math.max((Number(v.total_amount) || 0) - (Number(v.amount_paid) || 0), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await saveSubscription(clientId, v);
    setBusy(false);
    if (res.ok) { toast.success("Plan saved"); setErrors({}); router.refresh(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card title="Plan, discount & free period">
        <fieldset disabled={!canWrite} className="grid gap-4 sm:grid-cols-2">
          {fields.map((fd) => <FieldInput key={fd.name} field={fd} value={v[fd.name]} onChange={(x) => set(fd.name, x)} error={errors[fd.name]} options={fd.name === "plan_id" ? plans : undefined} />)}
        </fieldset>
        {canWrite && <div className="mt-5 flex justify-end"><button className="btn btn-primary" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Save plan"}</button></div>}
      </Card>
      <div className="space-y-4">
        <Card title="Status">
          {left === null ? <Badge value="no free period set" tone="muted" /> : left >= 0 ? <Badge value={`Free period — ${left} days left`} tone={left <= 7 ? "warn" : "ok"} /> : <Badge value={`Free period ended ${-left} days ago`} tone="danger" />}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Net price / cycle</dt><dd className="font-semibold tabular-nums">{inr(net)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Total</dt><dd className="tabular-nums">{inr(Number(v.total_amount) || 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Paid</dt><dd className="tabular-nums">{inr(Number(v.amount_paid) || 0)}</dd></div>
            <div className="flex justify-between border-t border-[var(--line)] pt-2"><dt className="font-semibold">Amount due</dt><dd className={`font-semibold tabular-nums ${due > 0 ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}>{inr(due)}</dd></div>
          </dl>
        </Card>
      </div>
    </form>
  );
}
