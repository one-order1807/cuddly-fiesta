"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { Offer } from "@/lib/content";

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
};

function useCountdown(endsAt?: string | null, on?: boolean) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!on || !endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) return setLeft(null);
      const d = Math.floor(ms / 86_400_000), h = Math.floor((ms / 3_600_000) % 24), m = Math.floor((ms / 60_000) % 60), s = Math.floor((ms / 1000) % 60);
      setLeft(`${d ? d + "d " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, on]);
  return left;
}

export function OfferBar({ offer }: { offer?: Offer }) {
  const left = useCountdown(offer?.ends_at, offer?.countdown);
  if (!offer?.bar_text) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex h-9 items-center justify-center gap-3 px-3 text-center text-xs font-semibold text-white sm:text-sm" style={{ background: offer.bar_color || "#2563EB" }}>
      <span className="truncate">{offer.bar_text}</span>
      {left && <span className="rounded bg-black/20 px-2 py-0.5 tabular-nums">{left}</span>}
      <a href={offer.link_target || "#contact"} className="hidden underline underline-offset-2 sm:inline">Claim →</a>
    </div>
  );
}

export function OfferPopup({ offer }: { offer?: Offer }) {
  const [open, setOpen] = useState(false);
  const left = useCountdown(offer?.ends_at, offer?.countdown);

  useEffect(() => {
    if (!offer) return;
    const key = `oo_offer_${offer.id}`;
    const last = Number(store.get(key) || 0);
    const gap = (offer.show_every_days || 1) * 86_400_000;
    const returning = store.get("oo_visited") === "1";
    store.set("oo_visited", "1");
    if (Date.now() - last < gap) return;
    if (offer.audience === "new" && returning) return;

    const show = () => { setOpen(true); store.set(key, String(Date.now())); cleanup(); };
    const timer = window.setTimeout(show, 9000);
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) show(); };
    document.addEventListener("mouseleave", onLeave);
    function cleanup() { window.clearTimeout(timer); document.removeEventListener("mouseleave", onLeave); }
    return cleanup;
  }, [offer]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (!offer || !open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={offer.title} onClick={() => setOpen(false)}>
      <div className="glass-strong rise relative w-full max-w-md rounded-3xl p-7" onClick={(e) => e.stopPropagation()}>
        <button className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--fg-muted)] hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
        {offer.badge && <span className="chip">{offer.badge}</span>}
        <h2 className="mt-3 text-4xl leading-[1.05]">{offer.popup_headline || offer.title}</h2>
        {left && <p className="mt-2 text-sm tabular-nums text-[var(--fg-muted)]">Ends in {left}</p>}
        <ul className="mt-5 space-y-2.5">
          {offer.perks.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-[var(--fg)]"><Check size={16} className="text-[var(--primary)]" />{p}</li>
          ))}
        </ul>
        <a href={offer.link_target || "#contact"} onClick={() => setOpen(false)} className="btn btn-primary mt-7 w-full !min-h-12">{offer.button_text || "Claim offer"}</a>
      </div>
    </div>
  );
}
