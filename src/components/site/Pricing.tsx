"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import type { Plan, Section } from "@/lib/content";
import { inr } from "@/lib/utils";
import { SectionHead } from "./Sections";

export default function Pricing({ section, plans }: { section?: Section; plans: Plan[] }) {
  const [yearly, setYearly] = useState(false);
  if ((section && !section.enabled) || !plans.length) return null;
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead s={section} center />
      <div data-reveal className="mx-auto mb-10 flex w-fit items-center rounded-full border border-white/10 p-1 text-sm font-semibold" role="group" aria-label="Billing period">
        {[false, true].map((y) => (
          <button key={String(y)} onClick={() => setYearly(y)} aria-pressed={yearly === y} className={`rounded-full px-5 py-2 transition-colors ${yearly === y ? "bg-[var(--primary)] text-white" : "text-[var(--fg-muted)]"}`}>
            {y ? "Yearly" : "Monthly"}
          </button>
        ))}
      </div>
      <div className={`grid gap-4 ${plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {plans.map((p) => {
          const price = yearly ? p.price_yearly : p.price_monthly;
          return (
            <article key={p.id} data-reveal className={`relative flex flex-col rounded-3xl p-7 ${p.highlight ? "bg-gradient-to-b from-[#16264d] to-[#0b1328] ring-2 ring-[var(--primary)] shadow-[0_30px_80px_-30px_rgba(59,130,246,.6)]" : "glass"}`}>
              {p.badge && <span className="absolute -top-3 left-7 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-bold text-white">{p.badge}</span>}
              <h3 className="text-3xl">{p.name}</h3>
              {p.best_for && <p className="mt-1 text-sm text-[var(--fg-muted)]">{p.best_for}</p>}
              <div className="mt-6 flex items-baseline gap-2">
                <span className="serif text-5xl tabular-nums">{inr(price)}</span>
                <span className="text-sm text-[var(--fg-muted)]">/{yearly ? "year" : "month"}</span>
              </div>
              {!yearly && p.original_price ? <p className="mt-1 text-sm text-[var(--fg-muted)]"><s>{inr(p.original_price)}</s> <span className="text-[var(--primary)]">limited offer</span></p> : <div className="mt-1 h-5" />}
              {p.free_setup_text && <p className="mt-3 inline-flex w-fit rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">{p.free_setup_text}</p>}
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f.text} className={`flex items-start gap-2.5 ${f.included ? "" : "text-[var(--fg-muted)]/60 line-through"}`}>
                    {f.included ? <Check size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" /> : <Minus size={16} className="mt-0.5 shrink-0" />}{f.text}
                  </li>
                ))}
              </ul>
              <dl className="mt-6 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center text-xs text-[var(--fg-muted)]">
                {Object.entries(p.limits).map(([k, v]) => <div key={k}><dd className="text-base font-semibold text-white">{v}</dd><dt className="capitalize">{k}</dt></div>)}
              </dl>
              <a href={`#contact`} className={`btn mt-6 !min-h-12 ${p.highlight ? "btn-primary" : "btn-ghost"}`}>{p.cta_text || "Get started"}</a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
