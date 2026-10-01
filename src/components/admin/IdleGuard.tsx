"use client";

import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/admin/actions";

const IDLE_MS = 30 * 60_000;
const WARN_MS = 2 * 60_000; // warn this long before signing out

/** Signs the admin out after 30 idle minutes, with a 2-minute warning they can dismiss by staying active. */
export default function IdleGuard() {
  const last = useRef(Date.now());
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const bump = () => { if (left === null) last.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) { clearInterval(id); void signOutAction(); }
      else if (idle >= IDLE_MS - WARN_MS) setLeft(Math.ceil((IDLE_MS - idle) / 1000));
      else setLeft(null);
    }, 1000);
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); clearInterval(id); };
  }, [left]);

  if (left === null) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Session expiring">
      <div className="glass-strong max-w-sm rounded-2xl p-6 text-center">
        <h2 className="serif text-2xl">Still there?</h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">You&apos;ll be signed out in <b className="tabular-nums">{left}s</b> because of inactivity.</p>
        <button className="btn btn-primary mt-5 w-full" onClick={() => { last.current = Date.now(); setLeft(null); }}>Stay signed in</button>
      </div>
    </div>
  );
}
