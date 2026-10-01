"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { EASE, prefersReducedMotion } from "@/lib/motion";

const MIN_MS = 1800; // never feels rushed, never longer than ~2.5s

export default function Preloader({ brand = "One-Order", by = "Cloud Build Tech" }: { brand?: string; by?: string }) {
  const overlay = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("oo_intro") === "1"; } catch { /* storage blocked */ }
    if (seen || prefersReducedMotion()) {
      setDone(true);
      (window as unknown as { __siteReady?: boolean }).__siteReady = true;
      window.dispatchEvent(new Event("site:ready"));
      return;
    }

    const html = document.documentElement;
    html.style.overflow = "hidden";
    const start = performance.now();
    let ready = document.readyState === "complete";
    const onLoad = () => { ready = true; };
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => { if (document.readyState === "complete") ready = true; });

    let progress = 0;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const cap = ready && elapsed > MIN_MS ? 100 : 92; // hold at 92% until really loaded + minimum time passed
      progress = Math.min(cap, progress + Math.random() * 9 + 2);
      if (count.current) count.current.textContent = String(Math.floor(progress));
      if (bar.current) bar.current.style.transform = `scaleX(${progress / 100})`;
      if (progress >= 100) {
        window.clearInterval(id);
        gsap.timeline({
          onComplete: () => {
            html.style.overflow = "";
            try { sessionStorage.setItem("oo_intro", "1"); } catch { /* ignore */ }
            setDone(true);
            (window as unknown as { __siteReady?: boolean }).__siteReady = true;
      window.dispatchEvent(new Event("site:ready"));
          },
        })
          .to(".pl-inner", { opacity: 0, y: -24, duration: 0.4, ease: EASE })
          .to(overlay.current, { yPercent: -100, duration: 1, ease: EASE }, "-=0.1");
      }
    }, 110);

    return () => { window.clearInterval(id); window.removeEventListener("load", onLoad); html.style.overflow = ""; };
  }, []);

  if (done) return null;
  return (
    <div ref={overlay} className="fixed inset-0 z-[100] grid place-items-center bg-[#050a16] text-white" role="status" aria-live="polite" aria-label="Loading">
      <div className="pl-inner w-[min(320px,80vw)] text-center">
        <div className="serif text-5xl tracking-tight">{brand}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-[#9db0d3]">× {by}</div>
        <div className="mt-10 flex items-end justify-center gap-1 tabular-nums">
          <span ref={count} className="serif text-6xl leading-none">0</span>
          <span className="pb-1 text-lg text-[#9db0d3]">%</span>
        </div>
        <div className="mx-auto mt-5 h-px w-full overflow-hidden bg-white/10">
          <div ref={bar} className="h-full origin-left bg-[#3b82f6]" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </div>
  );
}
