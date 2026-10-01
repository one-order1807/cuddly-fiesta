import Link from "next/link";
import type { Settings } from "@/lib/content";

export default function Footer({ settings }: { settings: Settings }) {
  const c = settings.contact ?? {};
  const b = settings.brand ?? {};
  const social = Object.entries(settings.social ?? {}).filter(([, v]) => v);
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="serif text-3xl">{b.name ?? "One-Order"}</div>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--fg-muted)]">× {b.by ?? "Cloud Build Tech"}</p>
          <p className="mt-4 max-w-xs text-sm text-[var(--fg-muted)]">Tablet-first café POS. Built in Pune.</p>
        </div>
        <div className="text-sm text-[var(--fg-muted)]">
          <div className="mb-3 font-semibold text-white">Contact</div>
          {c.address && <p>{c.address}</p>}
          {c.hours && <p className="mt-1">{c.hours}</p>}
          {c.phone && <p className="mt-1"><a href={`tel:${c.phone}`} className="hover:text-white">{c.phone}</a></p>}
          {c.email && <p className="mt-1"><a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a></p>}
        </div>
        <div className="text-sm text-[var(--fg-muted)]">
          <div className="mb-3 font-semibold text-white">Links</div>
          <ul className="space-y-1.5">
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/legal/terms" className="hover:text-white">Terms</Link></li>
            {social.map(([k, v]) => <li key={k}><a href={String(v)} className="capitalize hover:text-white" target="_blank" rel="noopener noreferrer">{k}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-[var(--fg-muted)]">© {new Date().getFullYear()} {b.name ?? "One-Order"} × {b.by ?? "Cloud Build Tech"}. All rights reserved.</div>
    </footer>
  );
}
