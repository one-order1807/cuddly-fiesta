"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { changePassword } from "./actions";
import { passwordScore } from "@/lib/admin/password";

const COLORS = ["var(--danger)", "var(--danger)", "var(--amber)", "var(--teal)", "var(--ok)"];

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, null);
  const [pw, setPw] = useState("");
  const { score, label } = passwordScore(pw);

  return (
    <form action={action} className="glass-strong w-full max-w-[26rem] rounded-3xl p-8">
      <h1 className="serif text-3xl">{forced ? "Set your own password" : "Change password"}</h1>
      {forced && <p className="mt-2 text-sm text-[var(--fg-muted)]">For security, the starter password must be replaced before you continue.</p>}
      <div className="mt-6 grid gap-4">
        <div>
          <label className="label" htmlFor="password">New password (min 12 characters)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full bg-[var(--line)] transition-colors" style={pw && i < score ? { background: COLORS[score] } : undefined} />)}
          </div>
          <p className="mt-1 text-xs text-[var(--fg-muted)]" aria-live="polite">{pw ? label : "Longer is stronger — try a passphrase."}</p>
        </div>
        <div><label className="label" htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" /></div>
        {state?.error && <p role="alert" className="text-sm text-[var(--danger)]">{state.error}</p>}
        <button className="btn btn-primary !min-h-11" disabled={pending}>{pending ? <Loader2 className="animate-spin" size={18} /> : "Save password"}</button>
      </div>
    </form>
  );
}
