"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { confirmTotp, disableTotp, enrollTotp } from "@/app/admin/security-actions";
import { Card } from "./ui";

export default function MfaCard({ enrolled, available }: { enrolled: boolean; available: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card title="Two-factor authentication (TOTP)">
      {!available ? <p className="text-sm text-[var(--fg-muted)]">Available when signed in with a real Supabase account.</p> : enrolled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm"><ShieldCheck size={18} className="text-[var(--ok)]" /> Enabled — a code is required at every sign-in.</p>
          <button className="btn btn-ghost" disabled={busy} onClick={async () => { if (!confirm("Turn off two-factor authentication?")) return; setBusy(true); const r = await disableTotp(); setBusy(false); if (r.ok) { toast.success("Two-factor turned off"); router.refresh(); } else toast.error(r.error); }}>Turn off</button>
        </div>
      ) : setup ? (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code to scan with your authenticator app" className="h-44 w-44 rounded-xl bg-white p-2" />
          <div className="space-y-3">
            <p className="text-sm">Scan with Google Authenticator, Authy or 1Password, then enter the 6-digit code.</p>
            <p className="text-xs text-[var(--fg-muted)]">Can&apos;t scan? Enter this key manually: <code className="break-all font-mono">{setup.secret}</code></p>
            <div className="flex gap-2"><input className="input max-w-[10rem] tracking-[0.3em]" inputMode="numeric" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="Authentication code" />
              <button className="btn btn-primary" disabled={busy || code.replace(/\s/g, "").length < 6} onClick={async () => { setBusy(true); const r = await confirmTotp(setup.factorId, code); setBusy(false); if (r.ok) { toast.success("Two-factor enabled"); setSetup(null); router.refresh(); } else toast.error(r.error); }}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Verify & enable"}</button></div>
            <p className="text-xs text-[var(--fg-muted)]">Supabase doesn&apos;t issue recovery codes. Keep the secret key above somewhere safe, or enrol a second device.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--fg-muted)]">Add a second step at sign-in. Strongly recommended for the owner account.</p>
          <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); const r = await enrollTotp(); setBusy(false); if (r.ok) setSetup(r.data); else toast.error(r.error); }}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Set up"}</button>
        </div>
      )}
    </Card>
  );
}
