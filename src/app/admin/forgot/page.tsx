"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { requestReset } from "../login/actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(requestReset, null);
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="orbs" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /></div>
      <div className="glass-strong w-full max-w-[26rem] rounded-3xl p-8">
        <h1 className="serif text-3xl">Reset password</h1>
        {state?.ok ? (
          <div className="mt-6 text-center">
            <MailCheck className="mx-auto text-[var(--primary)]" size={36} />
            <p className="mt-3 text-sm text-[var(--fg-muted)]">If that email belongs to an admin, a reset link is on its way.</p>
            <a className="btn btn-ghost mt-6" href="/admin/login">Back to sign in</a>
          </div>
        ) : (
          <form action={action} className="mt-5 grid gap-4">
            <div><label className="label" htmlFor="email">Admin email</label><input id="email" name="email" type="email" required autoFocus className="input" /></div>
            <button className="btn btn-primary" disabled={pending}>{pending ? <Loader2 className="animate-spin" size={18} /> : "Send reset link"}</button>
            <a href="/admin/login" className="text-center text-sm text-[var(--fg-muted)] hover:underline">Back to sign in</a>
          </form>
        )}
      </div>
    </main>
  );
}
