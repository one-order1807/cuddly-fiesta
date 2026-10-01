"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { vaultCreate, vaultDelete, vaultList, vaultReveal, type VaultItem } from "@/app/admin/vault-actions";
import { Card, EmptyState } from "../ui";
import { daysUntil } from "@/lib/utils";

const HIDE_AFTER = 20; // seconds a revealed secret stays on screen
const CLIPBOARD_CLEAR = 30_000;

export default function VaultPanel({ clientId, canReveal, canWrite }: { clientId: string; canReveal: boolean; canWrite: boolean }) {
  const [items, setItems] = useState<VaultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [askFor, setAskFor] = useState<VaultItem | null>(null);
  const [shown, setShown] = useState<{ id: string; secret: string; left: number } | null>(null);
  const clipTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const r = await vaultList(clientId);
    if (r.ok) { setItems(r.data); setError(null); } else { setError(r.error); setItems([]); }
  }, [clientId]);
  useEffect(() => { void load(); }, [load]);

  // auto-hide countdown
  useEffect(() => {
    if (!shown) return;
    if (shown.left <= 0) { setShown(null); return; }
    const t = setTimeout(() => setShown((s) => (s ? { ...s, left: s.left - 1 } : s)), 1000);
    return () => clearTimeout(t);
  }, [shown]);
  // never leave a secret in state if the tab goes away
  useEffect(() => () => setShown(null), []);

  async function copy(secret: string) {
    await navigator.clipboard.writeText(secret);
    toast.success("Copied — clipboard clears in 30 s");
    if (clipTimer.current) clearTimeout(clipTimer.current);
    clipTimer.current = window.setTimeout(async () => { try { await navigator.clipboard.writeText(""); } catch { /* focus lost */ } }, CLIPBOARD_CLEAR);
  }

  if (items === null) return <div className="skeleton h-40" />;

  return (
    <Card title="Credentials vault" action={canWrite && !error ? <button className="btn btn-primary !min-h-9" onClick={() => setAdding(true)}><Plus size={15} /> Add</button> : undefined}>
      <p className="mb-4 text-xs text-[var(--fg-muted)]">Secrets are encrypted (AES-256-GCM) and hidden by default. Revealing needs your password, hides after {HIDE_AFTER}s and is written to the audit log.</p>
      {error ? <EmptyState title="Vault unavailable" hint={error} /> : items.length === 0 ? <EmptyState title="No credentials stored" hint="Add logins like the client's POS account, Supabase or domain registrar." /> : (
        <ul className="divide-y divide-[var(--line)]">
          {items.map((c) => {
            const due = daysUntil(new Date(new Date(c.last_changed_at).getTime() + c.rotation_days * 86_400_000).toISOString());
            const open = shown?.id === c.id;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <KeyRound size={18} className="shrink-0 text-[var(--primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.label}</p>
                  <p className="truncate text-xs text-[var(--fg-muted)]">{c.username || "—"}{c.url ? ` · ${c.url}` : ""}</p>
                  {due !== null && due <= 14 && <p className="text-xs font-semibold text-[var(--amber)]">{due < 0 ? `Rotation overdue by ${-due} days` : `Rotate within ${due} days`}</p>}
                </div>
                <code className="min-w-[10rem] rounded-lg bg-[var(--line)] px-3 py-1.5 text-center font-mono text-sm" aria-live="polite">{open ? shown!.secret : "••••••••••"}</code>
                {open && <span className="w-8 text-center text-xs tabular-nums text-[var(--fg-muted)]">{shown!.left}s</span>}
                <div className="flex gap-1">
                  {canReveal && (open
                    ? <><button className="btn btn-ghost !min-h-9 !px-2.5" onClick={() => copy(shown!.secret)} aria-label="Copy secret"><Copy size={15} /></button><button className="btn btn-ghost !min-h-9 !px-2.5" onClick={() => setShown(null)} aria-label="Hide secret"><EyeOff size={15} /></button></>
                    : <button className="btn btn-ghost !min-h-9" onClick={() => setAskFor(c)}><Eye size={15} /> Reveal</button>)}
                  {canWrite && <button className="btn btn-ghost !min-h-9 !px-2.5 text-[var(--danger)]" aria-label="Delete credential" onClick={async () => { if (!confirm(`Delete “${c.label}”? This cannot be undone.`)) return; const r = await vaultDelete(c.id); if (r.ok) { toast.success("Deleted"); void load(); } else toast.error(r.error); }}><Trash2 size={15} /></button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {askFor && <ReauthDialog item={askFor} onClose={() => setAskFor(null)} onRevealed={(secret) => { setShown({ id: askFor.id, secret, left: HIDE_AFTER }); setAskFor(null); }} />}
      {adding && <AddDialog clientId={clientId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); void load(); }} />}
    </Card>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="glass-strong w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="serif text-2xl">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--primary-soft)]" aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function ReauthDialog({ item, onClose, onRevealed }: { item: VaultItem; onClose: () => void; onRevealed: (secret: string) => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title="Confirm it's you" onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await vaultReveal(item.id, pw); setBusy(false); setPw(""); if (r.ok) onRevealed(r.data.secret); else setErr(r.error); }} className="grid gap-3">
        <p className="text-sm text-[var(--fg-muted)]">Enter your admin password to reveal <b>{item.label}</b>.</p>
        <input type="password" autoFocus autoComplete="current-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Your password" />
        {err && <p role="alert" className="text-sm text-[var(--danger)]">{err}</p>}
        <button className="btn btn-primary" disabled={busy || !pw}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Reveal"}</button>
      </form>
    </Modal>
  );
}

function AddDialog({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ label: "", username: "", url: "", secret: "", notes: "", rotation_days: 90 });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title="Add credential" onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await vaultCreate(clientId, v); setBusy(false); if (r.ok) { toast.success("Stored encrypted"); onSaved(); } else toast.error(r.error); }} className="grid gap-3">
        <div><label className="label" htmlFor="v-label">Label *</label><input id="v-label" required className="input" value={v.label} onChange={set("label")} placeholder="Client POS login" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="v-user">Login ID</label><input id="v-user" className="input" value={v.username} onChange={set("username")} autoComplete="off" /></div><div><label className="label" htmlFor="v-url">URL</label><input id="v-url" className="input" value={v.url} onChange={set("url")} /></div></div>
        <div><label className="label" htmlFor="v-secret">Secret / password *</label><input id="v-secret" required type="password" className="input" value={v.secret} onChange={set("secret")} autoComplete="new-password" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="v-rot">Rotate every (days)</label><input id="v-rot" type="number" min={1} className="input" value={v.rotation_days} onChange={(e) => setV((p) => ({ ...p, rotation_days: Number(e.target.value) }))} /></div></div>
        <div><label className="label" htmlFor="v-notes">Notes</label><textarea id="v-notes" className="input" rows={2} value={v.notes} onChange={set("notes")} /></div>
        <button className="btn btn-primary" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Save encrypted"}</button>
      </form>
    </Modal>
  );
}
