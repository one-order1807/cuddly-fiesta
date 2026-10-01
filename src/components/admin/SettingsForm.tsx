"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Field } from "@/lib/admin/resources";
import { saveSetting } from "@/app/admin/settings-actions";
import { FieldInput } from "./FieldInputs";
import { Card } from "./ui";

export default function SettingsForm({ group, initial, canWrite }: { group: { key: string; title: string; fields: Field[] }; initial: Record<string, unknown>; canWrite: boolean }) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== saved;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await saveSetting(group.key, values);
    setBusy(false);
    if (res.ok) { setSaved(JSON.stringify(values)); toast.success(`${group.title} saved — press Publish to push it live`); } else toast.error(res.error);
  }

  return (
    <Card title={group.title}>
      <form onSubmit={submit}>
        <fieldset disabled={!canWrite} className="grid gap-4 sm:grid-cols-2">
          {group.fields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />)}
        </fieldset>
        {canWrite && (
          <div className="mt-5 flex items-center justify-end gap-3">
            <span className="text-xs text-[var(--fg-muted)]">{dirty ? "Unsaved changes" : "Saved"}</span>
            <button className="btn btn-primary" disabled={busy || !dirty}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Save"}</button>
          </div>
        )}
      </form>
    </Card>
  );
}
