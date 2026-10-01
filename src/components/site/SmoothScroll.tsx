"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DURATION, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll architecture (one owner per concern):
 *   Lenis  → smooth scroll position
 *   GSAP   → ticker drives Lenis; ScrollTrigger reads Lenis scroll
 * Every `[data-reveal]` element is revealed by ONE batched trigger (cheap, no per-element triggers).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const root = document.documentElement;
    let lenis: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;

    if (!reduced) {
      root.classList.add("js-motion");
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -72 } });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (t) => lenis!.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, duration: DURATION.base, ease: EASE_OUT, stagger: 0.09, overwrite: true }),
      });
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      root.classList.remove("js-motion");
    };
  }, []);

  return null;
}
