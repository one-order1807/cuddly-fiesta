"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#screens", label: "Screens" },
  { href: "#pricing", label: "Pricing" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav({ brand, by, hasBar }: { brand: string; by: string; hasBar: boolean }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 z-50 transition-[top] duration-300 ${hasBar ? "top-9" : "top-0"}`}>
      <div className={`mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${solid ? "glass-strong" : ""}`}>
        <a href="#top" className="flex items-baseline gap-2" aria-label={`${brand} home`}>
          <span className="serif text-2xl leading-none">{brand}</span>
          <span className="hidden text-[10px] uppercase tracking-[0.22em] text-[var(--fg-muted)] sm:inline">× {by}</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-[var(--fg-muted)] transition-colors hover:text-white">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#contact" className="btn btn-primary !min-h-9 !px-4 !text-sm">Get free setup</a>
          <button className="btn btn-ghost !min-h-9 !px-2.5 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="glass-strong mx-3 mt-2 rounded-2xl p-3 md:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-[var(--fg-muted)] hover:bg-white/5 hover:text-white">{l.label}</a>
          ))}
        </div>
      )}
    </header>
  );
}
