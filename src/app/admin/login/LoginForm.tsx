"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { signIn, verifyMfa, type LoginState } from "./actions";

export default function LoginForm({ next, demo }: { next?: string; demo?: boolean }) {
  const router = useRouter();
  const card = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<LoginState>({ step: "credentials" });
  const [pending, start] = useTransition();
  const [show, setShow] = useState(false);

  const submit = (fn: typeof signIn) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setView(await fn(view, fd)));
  };

  useEffect(() => {
    if (view.step !== "done") return;
    const dest = view.mustChange ? "/admin/change-password" : view.next || next || "/admin";
    const tl = gsap.timeline({ onComplete: () => router.replace(dest) });
    tl.to(".login-check", { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" })
      .to(card.current, { y: -24, opacity: 0, duration: 0.5, ease: "power3.inOut" }, "+=0.25");
    return () => { tl.kill(); };
  }, [view, router, next]);

  const error = "error" in view ? view.error : undefined;
  const nonce = "nonce" in view ? view.nonce : 0;

  return (
    <div ref={card} key={nonce} className={`glass-strong relative w-full max-w-[26rem] rounded-3xl p-7 sm:p-9 ${error ? "shake" : ""}`}>
      <div className="mb-7 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="serif text-4xl">One-Order</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-muted)]">× Cloud Build Tech</span>
        </div>
        <h1 className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Admin Portal</h1>
      </div>

      {view.step === "done" ? (
        <div className="grid place-items-center py-10">
          <div className="login-check grid h-16 w-16 scale-50 place-items-center rounded-full bg-[var(--ok)] text-white opacity-0"><Check size={32} /></div>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">Signed in. Loading your dashboard…</p>
        </div>
      ) : view.step === "mfa" ? (
        <form onSubmit={submit(verifyMfa)} className="grid gap-4">
          <input type="hidden" name="factorId" value={view.factorId} />
          <div className="text-center text-sm text-[var(--fg-muted)]"><ShieldCheck className="mx-auto mb-2 text-[var(--primary)]" />Enter the 6-digit code from your authenticator app.</div>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus required className="input text-center text-xl tracking-[0.5em]" aria-label="Authentication code" />
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <button className="btn btn-primary" disabled={pending}>{pending ? <Loader2 className="animate-spin" size={18} /> : "Verify"}</button>
        </form>
      ) : (
        <form onSubmit={submit(signIn)} className="grid gap-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required={!demo} autoFocus className="input" placeholder="you@one-order.co.in" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required={!demo} className="input pr-11" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--fg-muted)] hover:bg-[var(--primary-soft)]" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-[var(--fg-muted)]"><input type="checkbox" name="remember" className="h-4 w-4 accent-[var(--primary)]" /> Remember this device</label>
            <a href="/admin/forgot" className="font-medium text-[var(--primary)] hover:underline">Forgot password?</a>
          </div>
          {error && <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
          <button className="btn btn-primary !min-h-11" disabled={pending}>{pending ? <><Loader2 className="animate-spin" size={18} /> Signing in…</> : demo ? "Enter demo" : "Sign in"}</button>
          {demo && <p className="text-center text-xs text-[var(--fg-muted)]">Demo mode (dev only) — no credentials needed.</p>}
        </form>
      )}
    </div>
  );
}
