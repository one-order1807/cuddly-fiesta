"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Mail, MessageCircle, Pencil, Phone, PhoneCall, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { addNote, setClientStage } from "@/app/admin/client-actions";
import { EditDrawer, type ClientResource } from "../ResourceManager";
import type { Row } from "@/lib/admin/db";
import { defaults, type Resource } from "@/lib/admin/resources";
import { cn } from "@/lib/utils";

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

export function ContactButtons({ client }: { client: Row }) {
  const wa = digits(client.whatsapp || client.phone);
  const summary = [client.business_name, client.owner_name, client.phone, client.email, client.city].filter(Boolean).join("\n");
  return (
    <div className="flex flex-wrap gap-2">
      {wa && <a className="btn btn-ghost !min-h-9" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
      {client.phone && <a className="btn btn-ghost !min-h-9" href={`tel:${client.phone}`}><Phone size={15} /> Call</a>}
      {client.email && <a className="btn btn-ghost !min-h-9" href={`mailto:${client.email}`}><Mail size={15} /> Email</a>}
      <button className="btn btn-ghost !min-h-9" onClick={async () => { await navigator.clipboard.writeText(summary); toast.success("Details copied"); }}><Copy size={15} /> Copy</button>
    </div>
  );
}

export function EditClientButton({ resource, client, refs = {} }: { resource: ClientResource; client: Row; refs?: Record<string, { value: string; label: string }[]> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const values = { ...defaults(resource as unknown as Resource), ...Object.fromEntries(resource.fields.map((f) => [f.name, client[f.name] ?? (f.type === "bool" ? false : "")])) };
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Pencil size={15} /> Edit details</button>
      {open && <EditDrawer resource={resource} state={{ id: String(client.id), values }} refs={refs} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast.success("Client saved"); router.refresh(); }} />}
    </>
  );
}

export function StagePipeline({ clientId, stages, current, canWrite }: { clientId: string; stages: string[]; current: string; canWrite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const idx = stages.indexOf(current);
  async function go(s: string) {
    setBusy(s);
    const res = await setClientStage(clientId, s);
    setBusy(null);
    if (res.ok) { toast.success(`Moved to ${s}`); router.refresh(); } else toast.error(res.error);
  }
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Onboarding stage">
      {stages.map((s, i) => (
        <li key={s}>
          <button disabled={!canWrite || busy !== null} onClick={() => go(s)} aria-current={i === idx ? "step" : undefined}
            className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", i < idx && "border-[var(--ok)]/40 bg-[color-mix(in_srgb,var(--ok)_12%,transparent)] text-[var(--ok)]", i === idx && "border-[var(--primary)] bg-[var(--primary)] text-white", i > idx && "border-[var(--line)] text-[var(--fg-muted)] hover:border-[var(--primary)]")}>
            {busy === s ? <Loader2 size={14} className="animate-spin" /> : i < idx ? <Check size={14} /> : <span className="text-xs opacity-70">{i + 1}</span>}{s}
          </button>
        </li>
      ))}
    </ol>
  );
}

export function NoteBox({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"note" | "call">("note");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await addNote(clientId, kind, body);
    setBusy(false);
    if (res.ok) { setBody(""); router.refresh(); } else toast.error(res.error);
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note or log a call…" aria-label="Note" />
      <div className="flex items-center justify-between">
        <div className="flex gap-1" role="group" aria-label="Entry type">
          <button type="button" aria-pressed={kind === "note"} onClick={() => setKind("note")} className={cn("btn !min-h-8 !px-3 text-xs", kind === "note" ? "btn-primary" : "btn-ghost")}><StickyNote size={13} /> Note</button>
          <button type="button" aria-pressed={kind === "call"} onClick={() => setKind("call")} className={cn("btn !min-h-8 !px-3 text-xs", kind === "call" ? "btn-primary" : "btn-ghost")}><PhoneCall size={13} /> Call log</button>
        </div>
        <button className="btn btn-primary !min-h-9" disabled={busy || !body.trim()}>{busy ? <Loader2 size={15} className="animate-spin" /> : "Add"}</button>
      </div>
    </form>
  );
}
