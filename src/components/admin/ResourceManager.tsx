"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteResource, listResource, reorderResource, restoreResource, saveResource, getRefOptions } from "@/app/admin/actions";
import { defaults, slugify, type Col, type Field, type Option, type Resource } from "@/lib/admin/resources";
import type { Row } from "@/lib/admin/db";
import { FieldInput } from "./FieldInputs";
import { PREVIEWS } from "./Previews";
import { Badge, EmptyState } from "./ui";
import { inr } from "@/lib/utils";

export type ClientResource = Omit<Resource, "write"> & { canWrite: boolean };

export default function ResourceManager({ resource: r, initialRows, scope, embedded }: { resource: ClientResource; initialRows: Row[]; scope?: { col: string; value: string }; embedded?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, unknown> } | null>(null);
  const [refs, setRefs] = useState<Record<string, Option[]>>({});
  const [loading, startLoad] = useTransition();
  const filtered = Boolean(q || status);

  useEffect(() => setRows(initialRows), [initialRows]);

  // Load options for "ref" fields once
  useEffect(() => {
    r.fields.filter((f) => f.type === "ref" && f.ref).forEach(async (f) => {
      const o = await getRefOptions(f.ref!.table, f.ref!.label);
      setRefs((p) => ({ ...p, [f.name]: o }));
    });
  }, [r.fields]);

  const openNew = useCallback(() => r.canWrite && setEditing({ id: null, values: defaults(r as unknown as Resource) }), [r]);
  useEffect(() => {
    if (embedded) return; // tabs on a detail page don't all fight over the N shortcut
    window.addEventListener("admin:new", openNew);
    return () => window.removeEventListener("admin:new", openNew);
  }, [openNew, embedded]);
  useEffect(() => { if (!embedded && params.get("new") === "1") { openNew(); router.replace(window.location.pathname); } }, [params, openNew, router, embedded]);

  // debounced server search / filter
  useEffect(() => {
    const t = setTimeout(() => startLoad(async () => setRows(await listResource(r.key, { q, status, scope }))), 250);
    return () => clearTimeout(t);
  }, [q, status, r.key, scope]);

  async function remove(row: Row) {
    const id = String(row.id);
    const res = await deleteResource(r.key, id);
    if (!res.ok) return toast.error(res.error);
    setRows((p) => p.filter((x) => x.id !== row.id));
    toast(`${cap(r.singular)} deleted`, r.soft ? { action: { label: "Undo", onClick: async () => { await restoreResource(r.key, id); setRows(await listResource(r.key, { q, status, scope })); } }, duration: 8000 } : undefined);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rows.findIndex((x) => x.id === e.active.id), to = rows.findIndex((x) => x.id === e.over!.id);
    const next = arrayMove(rows, from, to);
    setRows(next);
    const res = await reorderResource(r.key, next.map((x) => String(x.id)));
    if (!res.ok) { toast.error(res.error); router.refresh(); } else toast.success("Order saved");
  }

  const sortable = r.sortable && r.canWrite && !filtered;
  const primary = r.columns.find((c) => c.primary) ?? r.columns[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input className="input !pl-9" placeholder={`Search ${r.title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        {r.statusFilter && (
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {r.statusFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {loading && <Loader2 size={16} className="animate-spin text-[var(--fg-muted)]" />}
        <span className="text-xs text-[var(--fg-muted)]">{rows.length} {rows.length === 1 ? r.singular : r.singular + "s"}</span>
        {r.canWrite && <button className="btn btn-primary ml-auto" onClick={openNew}><Plus size={16} /> New {r.singular}</button>}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={filtered ? "Nothing matches" : `No ${r.title.toLowerCase()} yet`} hint={filtered ? "Try a different search or filter." : `Add your first ${r.singular}. Press N anywhere on this page as a shortcut.`} action={!filtered && r.canWrite ? <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New {r.singular}</button> : undefined} />
      ) : (
        <DndContext id={`dnd-${r.key}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                  {sortable && <th className="w-8" />}
                  {r.columns.map((c) => <th key={c.name} className={`px-4 py-3 font-semibold ${c !== primary && c.kind !== "badge" ? "hidden md:table-cell" : ""}`}>{c.label}</th>)}
                  <th className="w-24" />
                </tr>
              </thead>
                <SortableContext items={rows.map((x) => String(x.id))} strategy={verticalListSortingStrategy} disabled={!sortable}>
                  <tbody>
                    {rows.map((row) => (
                      <RowView key={String(row.id)} row={row} cols={r.columns} primary={primary} sortable={!!sortable} canWrite={r.canWrite}
                        detailHref={r.detailHref} onEdit={() => setEditing({ id: String(row.id), values: { ...defaults(r as unknown as Resource), ...pick(row, r.fields) } })} onDelete={() => remove(row)} />
                    ))}
                  </tbody>
                </SortableContext>
            </table>
          </div>
        </div>
        </DndContext>
      )}

      {editing && (
        <EditDrawer resource={r} scope={scope} state={editing} refs={refs} onClose={() => setEditing(null)}
          onSaved={(row, isNew) => { setRows((p) => (isNew ? [...p, row] : p.map((x) => (x.id === row.id ? row : x)))); setEditing(null); toast.success(`${cap(r.singular)} saved${r.cms ? " — press Publish to push it live" : ""}`); router.refresh(); }} />
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (row: Row, fields: Field[]) => Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? (f.type === "bool" ? false : "")]));

function RowView({ row, cols, primary, sortable, canWrite, detailHref, onEdit, onDelete }: { detailHref?: string; row: Row; cols: Col[]; primary: Col; sortable: boolean; canWrite: boolean; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(row.id), disabled: !sortable });
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }} className="group border-b border-[var(--line)] last:border-0 hover:bg-[var(--primary-soft)]/50">
      {sortable && <td className="pl-3"><button className="cursor-grab touch-none rounded p-1 text-[var(--fg-muted)]" aria-label="Drag to reorder" {...attributes} {...listeners}><GripVertical size={16} /></button></td>}
      {cols.map((c) => (
        <td key={c.name} className={`px-4 py-3 ${c !== primary && c.kind !== "badge" ? "hidden md:table-cell" : ""} ${c === primary ? "font-semibold" : ""}`}>
          {c === primary ? (detailHref ? <Link href={detailHref + row.id} className="text-left hover:text-[var(--primary)] hover:underline">{cell(row, c) || "—"}</Link> : <button onClick={onEdit} className="text-left hover:text-[var(--primary)] hover:underline">{cell(row, c) || "—"}</button>) : cell(row, c)}
        </td>
      ))}
      <td className="px-3 text-right">
        {canWrite && <span className="inline-flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="rounded-lg p-2 hover:bg-[var(--primary-soft)]" aria-label="Edit"><Pencil size={15} /></button>
          <button onClick={onDelete} className="rounded-lg p-2 text-[var(--danger)] hover:bg-[var(--primary-soft)]" aria-label="Delete"><Trash2 size={15} /></button>
        </span>}
      </td>
    </tr>
  );
}

function cell(row: Row, c: Col): React.ReactNode {
  const v = row[c.name];
  switch (c.kind) {
    case "badge": return v ? <Badge value={String(v)} /> : null;
    case "bool": return v ? <span className="font-semibold text-[var(--ok)]">Yes</span> : <span className="text-[var(--fg-muted)]">No</span>;
    case "money": return v == null ? "—" : inr(Number(v));
    case "date": return v ? new Date(String(v)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
    case "count": return <span className="tabular-nums">{String(v ?? 0)}</span>;
    case "rating": return <span className="inline-flex text-[var(--amber)]">{Array.from({ length: Number(v) || 0 }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}</span>;
    case "image": return v ? <img src={String(v)} alt="" className="h-9 w-14 rounded-md object-cover" /> : <span className="grid h-9 w-14 place-items-center rounded-md bg-[var(--line)]" />;
    default: return <span className="line-clamp-1 max-w-[28ch]">{v == null ? "" : String(v)}</span>;
  }
}

export function EditDrawer({ resource: r, scope, state, refs, onClose, onSaved }: { resource: ClientResource; scope?: { col: string; value: string }; state: { id: string | null; values: Record<string, unknown> }; refs: Record<string, Option[]>; onClose: () => void; onSaved: (row: Row, isNew: boolean) => void }) {
  const [values, setValues] = useState(state.values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const initial = useRef(JSON.stringify(state.values));
  const dirty = JSON.stringify(values) !== initial.current;
  const Preview = PREVIEWS[r.key] as ((p: { v: Record<string, unknown> }) => React.ReactNode) | undefined;

  const close = useCallback(() => { if (!dirty || confirm("Discard unsaved changes?")) onClose(); }, [dirty, onClose]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  // Unsaved-changes guard on tab close
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = (name: string, v: unknown) => {
    setValues((p) => {
      const next = { ...p, [name]: v };
      // helpful default: derive slug from the name while the slug is still untouched
      if (!state.id && name === "name" && "slug" in p && (!p.slug || p.slug === slugify(String(p.name ?? "")))) next.slug = slugify(String(v));
      return next;
    });
    if (errors[name]) setErrors((e) => { const n = { ...e }; delete n[name]; return n; });
  };

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    const res = await saveResource(r.key, state.id, values, scope);
    setSaving(false);
    if (res.ok) onSaved(res.data, !state.id);
    else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={close}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-strong flex h-full w-full max-w-[56rem] flex-col rounded-l-3xl" role="dialog" aria-modal="true" aria-label={`${state.id ? "Edit" : "New"} ${r.singular}`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="serif text-3xl">{state.id ? "Edit" : "New"} {r.singular}</h2>
          <button type="button" onClick={close} className="rounded-lg p-2 hover:bg-[var(--primary-soft)]" aria-label="Close"><X size={18} /></button>
        </div>
        <div className={`grid flex-1 gap-6 overflow-y-auto px-6 py-5 ${Preview ? "lg:grid-cols-[1fr_20rem]" : ""}`}>
          <div className="grid h-fit gap-4 sm:grid-cols-2">
            {r.fields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} error={errors[f.name]} options={refs[f.name]} />)}
          </div>
          {Preview && <aside className="h-fit lg:sticky lg:top-0"><p className="label">Live preview</p><Preview v={values} /></aside>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
          <span className="text-xs text-[var(--fg-muted)]" aria-live="polite">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button className="btn btn-primary" disabled={saving || (!!state.id && !dirty)}>{saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
