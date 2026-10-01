"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { CornerDownLeft, Search } from "lucide-react";
import { NAV } from "./nav";
import { globalSearch, type SearchHit } from "@/app/admin/search-actions";
import type { Role } from "@/lib/admin/roles";

export default function CommandPalette({ open, setOpen, role }: { open: boolean; setOpen: (v: boolean) => void; role: Role }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits(await globalSearch(q)), 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const pages = NAV.filter((n) => !n.roles || n.roles.includes(role)).flatMap((n) => [{ href: n.href, label: n.label }, ...(n.children ?? [])]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid items-start justify-items-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <Command label="Command palette" shouldFilter className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-4">
          <Search size={16} className="text-[var(--fg-muted)]" />
          <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search clients, leads, repos, pages…" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--fg-muted)]" />
          <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]">ESC</kbd>
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-[var(--fg-muted)]">No results.</Command.Empty>
          {hits.length > 0 && (
            <Command.Group heading="Results" className="text-xs text-[var(--fg-muted)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
              {hits.map((h) => (
                <Command.Item key={h.type + h.id} value={`${h.type} ${h.title} ${h.sub}`} onSelect={() => go(h.href)} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">
                  <span><span className="chip mr-2">{h.type}</span>{h.title}<span className="ml-2 text-xs text-[var(--fg-muted)]">{h.sub}</span></span>
                  <CornerDownLeft size={13} className="opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Go to" className="text-xs text-[var(--fg-muted)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
            {pages.map((p) => (
              <Command.Item key={p.href} value={`go ${p.label}`} onSelect={() => go(p.href)} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">{p.label}</Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions" className="text-xs text-[var(--fg-muted)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
            <Command.Item value="action add client" onSelect={() => go("/admin/clients?new=1")} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">Add client</Command.Item>
            <Command.Item value="action add review" onSelect={() => go("/admin/cms/testimonials?new=1")} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">Add review</Command.Item>
            <Command.Item value="action create offer" onSelect={() => go("/admin/cms/offers?new=1")} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">Create offer</Command.Item>
            <Command.Item value="action publish site" onSelect={() => go("/admin/cms")} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--fg)] data-[selected=true]:bg-[var(--primary-soft)]">Publish site…</Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
