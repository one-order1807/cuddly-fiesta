"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, GripVertical, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Field, Option } from "@/lib/admin/resources";
import { uploadImage } from "@/app/admin/media-actions";
import { cn } from "@/lib/utils";

type Props = { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string; options?: Option[] };

export function FieldInput({ field: f, value, onChange, error, options }: Props) {
  const id = `f-${f.name}`;
  const common = { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : f.help ? `${id}-help` : undefined };
  let control: React.ReactNode;

  switch (f.type) {
    case "textarea":
    case "markdown":
      control = <textarea {...common} className={cn("input", f.type === "markdown" && "min-h-48 font-mono text-[13px]")} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
      break;
    case "number":
      control = <input {...common} type="number" inputMode="decimal" step="any" min={f.min} max={f.max} className="input" value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
      break;
    case "select":
    case "ref": {
      const opts = f.type === "ref" ? options ?? [] : f.options ?? [];
      control = (
        <select {...common} className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">—</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    }
    case "bool":
      control = (
        <button type="button" role="switch" aria-checked={!!value} id={id} onClick={() => onChange(!value)} className={cn("flex h-10 w-full items-center justify-between rounded-[0.65rem] border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-sm")}>
          <span>{value ? "Yes" : "No"}</span>
          <span className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-[var(--primary)]" : "bg-[var(--line)]")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", value ? "left-[1.4rem]" : "left-0.5")} /></span>
        </button>
      );
      break;
    case "date":
      control = <input {...common} type="date" className="input" value={String(value ?? "").slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "datetime":
      control = <input {...common} type="datetime-local" className="input" value={toLocalInput(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />;
      break;
    case "color":
      control = <div className="flex gap-2"><input {...common} type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1" value={String(value || "#2563eb")} onChange={(e) => onChange(e.target.value)} /><input className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} aria-label="Hex colour" /></div>;
      break;
    case "tags":
      control = <input {...common} className="input" value={(value as string[] | undefined)?.join(", ") ?? ""} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="comma, separated" />;
      break;
    case "lines":
      control = <textarea {...common} className="input" rows={4} value={(value as string[] | undefined)?.join("\n") ?? ""} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />;
      break;
    case "featurelist":
      control = <FeatureList value={(value as FeatureItem[]) ?? []} onChange={onChange} />;
      break;
    case "limits":
      control = <Limits value={(value as Record<string, number>) ?? {}} onChange={onChange} />;
      break;
    case "json":
      control = <JsonField value={value} onChange={onChange} id={id} />;
      break;
    case "image":
      control = <ImageField value={String(value ?? "")} onChange={onChange} />;
      break;
    default:
      control = <input {...common} type={f.type === "email" ? "email" : f.type === "url" ? "url" : f.type === "phone" ? "tel" : "text"} className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} maxLength={f.max} />;
  }

  return (
    <div className={cn(!f.half && "sm:col-span-2")}>
      <label className="label" htmlFor={id}>{f.label}{f.required && <span className="text-[var(--danger)]"> *</span>}</label>
      {control}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-[var(--danger)]">{error}</p> : f.help ? <p id={`${id}-help`} className="mt-1 text-xs text-[var(--fg-muted)]">{f.help}</p> : null}
    </div>
  );
}

function toLocalInput(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (isNaN(+d)) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type FeatureItem = { group?: string | null; text: string; included: boolean };

function FeatureList({ value, onChange }: { value: FeatureItem[]; onChange: (v: FeatureItem[]) => void }) {
  const [drag, setDrag] = useState<number | null>(null);
  const set = (i: number, patch: Partial<FeatureItem>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (from: number, to: number) => { if (from === to) return; const a = [...value]; const [m] = a.splice(from, 1); a.splice(to, 0, m); onChange(a); };
  return (
    <div className="space-y-2">
      {value.map((it, i) => (
        <div key={i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }} className="flex items-center gap-2">
          <GripVertical size={16} className="shrink-0 cursor-grab text-[var(--fg-muted)]" aria-hidden />
          <button type="button" onClick={() => set(i, { included: !it.included })} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", it.included ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--line)] text-[var(--fg-muted)]")} aria-label={it.included ? "Included — click to exclude" : "Excluded — click to include"} aria-pressed={it.included}>{it.included ? <Check size={16} /> : <X size={16} />}</button>
          <input className="input" placeholder="Feature text" value={it.text} onChange={(e) => set(i, { text: e.target.value })} aria-label={`Feature ${i + 1}`} />
          <input className="input !w-28 shrink-0" placeholder="Group" value={it.group ?? ""} onChange={(e) => set(i, { group: e.target.value })} aria-label="Group" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-lg p-2 text-[var(--fg-muted)] hover:text-[var(--danger)]" aria-label="Remove feature"><Trash2 size={16} /></button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost !min-h-9" onClick={() => onChange([...value, { group: value.at(-1)?.group ?? "", text: "", included: true }])}><Plus size={15} /> Add feature</button>
    </div>
  );
}

function Limits({ value, onChange }: { value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  const keys = Array.from(new Set(["outlets", "users", "printers", "tables", ...Object.keys(value)]));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {keys.map((k) => (
        <div key={k}><label className="label capitalize" htmlFor={`lim-${k}`}>{k}</label><input id={`lim-${k}`} type="number" min={0} className="input" value={value[k] ?? ""} onChange={(e) => { const n = { ...value }; if (e.target.value === "") delete n[k]; else n[k] = Number(e.target.value); onChange(n); }} /></div>
      ))}
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image is larger than 5 MB.");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadImage(fd);
    setBusy(false);
    if (res.ok) { onChange(res.data.url); toast.success("Image uploaded"); } else toast.error(res.error);
  }

  return (
    <div className="flex items-start gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
        className={cn("relative grid h-24 w-36 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed text-[var(--fg-muted)]", over ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--line)]")}
      >
        {value ? (value.startsWith("data:") ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Image src={value} alt="" fill className="object-cover" sizes="144px" unoptimized />) : <ImagePlus size={22} />}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !min-h-9" onClick={() => input.current?.click()} disabled={busy}>Upload</button>
          {value && <button type="button" className="btn btn-ghost !min-h-9" onClick={() => onChange("")}>Remove</button>}
        </div>
        <input className="input !min-h-9 text-xs" placeholder="…or paste an image URL" value={value.startsWith("data:") ? "(uploaded image)" : value} readOnly={value.startsWith("data:")} onChange={(e) => onChange(e.target.value)} aria-label="Image URL" />
        <p className="text-xs text-[var(--fg-muted)]">PNG, JPEG, WebP or AVIF · max 5 MB · drag a file onto the box</p>
      </div>
    </div>
  );
}

function JsonField({ value, onChange, id }: { value: unknown; onChange: (v: unknown) => void; id: string }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <>
      <textarea id={id} className={cn("input min-h-28 font-mono text-[12px]", bad && "border-[var(--danger)]")} value={text} spellCheck={false}
        onChange={(e) => { setText(e.target.value); try { const j = JSON.parse(e.target.value || "{}"); if (j && typeof j === "object" && !Array.isArray(j)) { setBad(false); onChange(j); } else setBad(true); } catch { setBad(true); } }} />
      {bad && <p className="mt-1 text-xs text-[var(--danger)]">Not valid JSON yet — changes aren’t applied until it parses (must be an object).</p>}
    </>
  );
}
