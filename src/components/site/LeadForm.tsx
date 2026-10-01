"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import type { Section, Settings } from "@/lib/content";
import { submitLead, type LeadState } from "@/app/(site)/actions";

export default function LeadForm({ section, settings }: { section?: Section; settings: Settings }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, null);
  const [utm, setUtm] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const o: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => { const v = p.get(k); if (v) o[k] = v; });
    setUtm(JSON.stringify(o));
  }, []);

  const wa = settings.contact?.whatsapp?.replace(/\D/g, "");
  const err = (k: string) => state?.errors?.[k];

  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-5 py-24">
      <div className="glass-strong overflow-hidden rounded-[2rem] p-7 sm:p-12 lg:grid lg:grid-cols-2 lg:gap-14">
        <div>
          {section?.eyebrow && <p data-reveal className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">{section.eyebrow}</p>}
          <h2 data-reveal className="text-[clamp(2.2rem,5vw,4rem)] leading-[1.02]">{section?.heading}</h2>
          <p data-reveal className="mt-4 max-w-md text-[var(--fg-muted)]">{section?.subheading}</p>
          {wa && (
            <a data-reveal href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi! I'd like to know more about One-Order.")}`} className="btn btn-ghost mt-8" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          )}
        </div>

        {state?.ok ? (
          <div className="rise mt-10 grid place-items-center rounded-2xl border border-white/10 p-10 text-center lg:mt-0">
            <CheckCircle2 size={44} className="text-[var(--ok)]" />
            <p className="serif mt-4 text-3xl">{state.message}</p>
          </div>
        ) : (
          <form action={action} className="mt-10 grid gap-4 lg:mt-0" noValidate>
            <input type="hidden" name="utm" value={utm} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="name">Your name *</label><input id="name" name="name" className="input" autoComplete="name" required aria-invalid={!!err("name")} />{err("name") && <p className="mt-1 text-xs text-[var(--danger)]">{err("name")}</p>}</div>
              <div><label className="label" htmlFor="phone">Phone / WhatsApp *</label><input id="phone" name="phone" type="tel" className="input" autoComplete="tel" required aria-invalid={!!err("phone")} />{err("phone") && <p className="mt-1 text-xs text-[var(--danger)]">{err("phone")}</p>}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="business_name">Café / business name</label><input id="business_name" name="business_name" className="input" /></div>
              <div><label className="label" htmlFor="city">City</label><input id="city" name="city" className="input" defaultValue="Pune" /></div>
            </div>
            <div><label className="label" htmlFor="business_type">Business type</label>
              <select id="business_type" name="business_type" className="input" defaultValue="cafe">
                <option value="cafe">Café</option><option value="restaurant">Restaurant</option><option value="hotel">Hotel</option><option value="bakery">Bakery</option><option value="bar">Bar</option><option value="other">Other</option>
              </select>
            </div>
            <div><label className="label" htmlFor="message">Anything we should know?</label><textarea id="message" name="message" className="input" rows={3} /></div>
            {state && !state.ok && <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}
            <button className="btn btn-primary !min-h-12 text-base" disabled={pending}>{pending ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : "Get my free setup"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
