"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, LogOut, Moon, Search, Sun, UserRound } from "lucide-react";
import { NAV, TABS } from "./nav";
import CommandPalette from "./CommandPalette";
import IdleGuard from "./IdleGuard";
import { signOutAction, signOutEverywhereAction } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/admin/session";
import { cn } from "@/lib/utils";

export default function Shell({ admin, unread, children }: { admin: AdminUser; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(pathname.startsWith("/admin/cms") ? "/admin/cms" : null);
  const gPressed = useRef<number>(0);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    try { setCollapsed(localStorage.getItem("oo_nav") === "1"); } catch { /* ignore */ }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("oo_theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  const toggleNav = () => { setCollapsed((c) => { try { localStorage.setItem("oo_nav", c ? "0" : "1"); } catch { /* ignore */ } return !c; }); };

  // Keyboard: ⌘/Ctrl+K palette · G then C/L/D/B/S navigate · N = new (pages listen for "admin:new")
  const onKey = useCallback((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); return; }
    if (t.closest("input,textarea,select,[contenteditable],dialog")) return;
    if (e.key === "g") { gPressed.current = Date.now(); return; }
    if (Date.now() - gPressed.current < 900) {
      const map: Record<string, string> = { d: "/admin", c: "/admin/clients", l: "/admin/leads", b: "/admin/billing", s: "/admin/support", w: "/admin/cms", r: "/admin/repos" };
      if (map[e.key]) { gPressed.current = 0; router.push(map[e.key]); return; }
    }
    if (e.key === "n") window.dispatchEvent(new Event("admin:new"));
    if (e.key === "/") { e.preventDefault(); setPalette(true); }
  }, [router]);
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(admin.role));
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="min-h-dvh">
      <div className="orbs" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" /></div>

      {/* Sidebar (desktop) */}
      <aside className={cn("glass fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--line)] transition-[width] duration-300 lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}>
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && <Link href="/admin" className="flex items-baseline gap-1.5"><span className="serif text-2xl">One-Order</span><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--fg-muted)]">Admin</span></Link>}
          <button onClick={toggleNav} className="rounded-lg p-2 text-[var(--fg-muted)] hover:bg-[var(--primary-soft)]" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}</button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {items.map((n) => {
            const Icon = n.icon;
            const isActive = active(n.href);
            if (n.children) {
              const open = openGroup === n.href && !collapsed;
              return (
                <div key={n.href}>
                  <button onClick={() => (collapsed ? router.push(n.href) : setOpenGroup(open ? null : n.href))} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--primary-soft)]", isActive && "text-[var(--primary)]")} title={collapsed ? n.label : undefined}>
                    <Icon size={18} className="shrink-0" />{!collapsed && <><span className="flex-1 text-left">{n.label}</span><ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} /></>}
                  </button>
                  {open && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[var(--line)] pl-3">
                      {n.children.map((c) => <Link key={c.href} href={c.href} className={cn("block rounded-lg px-3 py-1.5 text-[13px] text-[var(--fg-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--fg)]", pathname === c.href && "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]")}>{c.label}</Link>)}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link key={n.href} href={n.href} title={collapsed ? n.label : undefined} aria-current={isActive ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--primary-soft)]", isActive && "bg-[var(--primary-soft)] text-[var(--primary)]")}>
                <Icon size={18} className="shrink-0" />{!collapsed && n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64")}>
        {/* Top bar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line)] px-4 sm:px-6">
          <Link href="/admin" className="serif text-xl lg:hidden">One-Order</Link>
          <button onClick={() => setPalette(true)} className="ml-auto flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-sm text-[var(--fg-muted)] transition-colors hover:border-[var(--primary)] lg:ml-0">
            <Search size={15} /><span className="flex-1 text-left">Search…</span><kbd className="hidden rounded border border-[var(--line)] px-1.5 text-[10px] sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto hidden lg:block" />
          <button onClick={toggleTheme} className="rounded-xl p-2.5 text-[var(--fg-muted)] hover:bg-[var(--primary-soft)]" aria-label="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link href="/admin/reminders" className="relative rounded-xl p-2.5 text-[var(--fg-muted)] hover:bg-[var(--primary-soft)]" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell size={18} />{unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-[var(--primary-soft)]" aria-expanded={menu} aria-haspopup="menu">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">{admin.name[0]?.toUpperCase()}</span>
              <span className="hidden text-left text-xs leading-tight sm:block"><b className="block text-sm">{admin.name}</b><span className="capitalize text-[var(--fg-muted)]">{admin.role}</span></span>
            </button>
            {menu && (
              <div role="menu" className="glass-strong absolute right-0 mt-2 w-60 rounded-2xl p-2" onMouseLeave={() => setMenu(false)}>
                <div className="px-3 py-2 text-xs text-[var(--fg-muted)]">{admin.email}{admin.demo && <span className="chip ml-1">demo</span>}</div>
                <Link role="menuitem" href="/admin/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--primary-soft)]"><UserRound size={15} /> Profile & security</Link>
                <form action={signOutAction}><button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--primary-soft)]"><LogOut size={15} /> Sign out</button></form>
                <form action={signOutEverywhereAction}><button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--primary-soft)]"><LogOut size={15} /> Sign out everywhere</button></form>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-[88rem] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* Bottom tab bar (phones) */}
      <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
        {TABS.map((href) => {
          const n = NAV.find((x) => x.href === href)!;
          const Icon = n.icon;
          return <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-[var(--fg-muted)]", active(href) && "text-[var(--primary)]")}><Icon size={20} />{n.label.split(" ")[0]}</Link>;
        })}
      </nav>

      <CommandPalette open={palette} setOpen={setPalette} role={admin.role} />
      <IdleGuard />
    </div>
  );
}
