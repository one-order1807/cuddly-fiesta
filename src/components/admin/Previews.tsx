"use client";

import { Check, Minus, Star, X } from "lucide-react";
import { inr } from "@/lib/utils";

type V = Record<string, unknown>;
const s = (v: unknown) => (v == null ? "" : String(v));

/** Live previews mirror the public site's dark glass styling so what you edit is what visitors see. */
const dark = "rounded-3xl bg-[#0a1224] p-6 text-[#eef3ff] [--fg-muted:#9db0d3] [--primary:#3b82f6]";

export function PlanPreview({ v }: { v: V }) {
  const feats = (v.features as { text: string; included: boolean }[]) ?? [];
  const limits = (v.limits as Record<string, number>) ?? {};
  return (
    <div className={`${dark} relative ${v.highlight ? "ring-2 ring-[#3b82f6]" : "ring-1 ring-white/10"}`}>
      {v.badge ? <span className="absolute -top-3 left-6 rounded-full bg-[#3b82f6] px-3 py-1 text-xs font-bold text-white">{s(v.badge)}</span> : null}
      <h3 className="serif text-3xl">{s(v.name) || "Plan name"}</h3>
      <p className="text-sm text-[#9db0d3]">{s(v.best_for)}</p>
      <div className="mt-4 flex items-baseline gap-2"><span className="serif text-4xl">{inr(Number(v.price_monthly) || 0)}</span><span className="text-sm text-[#9db0d3]">/month</span></div>
      <p className="text-xs text-[#9db0d3]">or {inr(Number(v.price_yearly) || 0)}/year{v.original_price ? <> · <s>{inr(Number(v.original_price))}</s></> : null}</p>
      {v.free_setup_text ? <span className="mt-3 inline-block rounded-full bg-[#3b82f620] px-3 py-1 text-xs font-bold text-[#3b82f6]">{s(v.free_setup_text)}</span> : null}
      <ul className="mt-4 space-y-1.5 text-sm">
        {feats.filter((f) => f.text).map((f, i) => <li key={i} className={`flex items-start gap-2 ${f.included ? "" : "text-[#9db0d3]/60 line-through"}`}>{f.included ? <Check size={14} className="mt-0.5 shrink-0 text-[#3b82f6]" /> : <Minus size={14} className="mt-0.5 shrink-0" />}{f.text}</li>)}
      </ul>
      <div className="mt-4 grid grid-cols-4 gap-1 border-t border-white/10 pt-3 text-center text-[11px] text-[#9db0d3]">{Object.entries(limits).map(([k, n]) => <div key={k}><b className="block text-sm text-white">{n}</b>{k}</div>)}</div>
      <div className={`mt-4 rounded-xl py-2.5 text-center text-sm font-semibold ${v.highlight ? "bg-[#3b82f6] text-white" : "border border-white/15"}`}>{s(v.cta_text) || "Get started"}</div>
    </div>
  );
}

export function OfferPreview({ v }: { v: V }) {
  const perks = (v.perks as string[]) ?? [];
  return (
    <div className="space-y-3">
      {v.bar_text ? <div className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white" style={{ background: s(v.bar_color) || "#2563EB" }}>{s(v.bar_text)}</div> : null}
      <div className={`${dark} relative`}>
        <X size={16} className="absolute right-4 top-4 text-[#9db0d3]" />
        {v.badge ? <span className="rounded-full bg-[#3b82f620] px-2.5 py-0.5 text-xs font-bold text-[#3b82f6]">{s(v.badge)}</span> : null}
        <h3 className="serif mt-2 text-3xl leading-tight">{s(v.popup_headline) || s(v.title) || "Popup headline"}</h3>
        <ul className="mt-3 space-y-1.5 text-sm">{perks.filter(Boolean).map((p) => <li key={p} className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" />{p}</li>)}</ul>
        <div className="mt-5 rounded-xl bg-[#3b82f6] py-2.5 text-center text-sm font-semibold text-white">{s(v.button_text) || "Claim offer"}</div>
      </div>
    </div>
  );
}

export function ReviewPreview({ v }: { v: V }) {
  return (
    <div className={dark}>
      <div className="mb-2 flex gap-0.5 text-[#f59e0b]">{Array.from({ length: Number(v.rating) || 0 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</div>
      <p className="text-sm">“{s(v.short_text) || s(v.full_text) || "Review text appears here"}”</p>
      <div className="mt-4 flex items-center gap-3 text-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#3b82f620] font-bold text-[#3b82f6]">{s(v.customer_name)[0] || "?"}</span><div><b>{s(v.customer_name) || "Customer"}</b><div className="text-xs text-[#9db0d3]">{s(v.head_label) || [s(v.business), s(v.city)].filter(Boolean).join(" · ")}</div></div></div>
    </div>
  );
}

export const PREVIEWS: Record<string, (p: { v: V }) => React.ReactNode> = { plans: PlanPreview, offers: OfferPreview, testimonials: ReviewPreview };
