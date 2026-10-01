"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown } from "lucide-react";
import type { Section } from "@/lib/content";
import { EASE, hasWebGL, isCoarseOrSmall, prefersReducedMotion } from "@/lib/motion";
import { scrollState } from "./scene/state";
import PosScreenImage from "./PosScreenImage";

gsap.registerPlugin(ScrollTrigger);

const PosScene = dynamic(() => import("./scene/PosScene"), { ssr: false });

const BEAT_WINDOWS = [0.08, 0.3, 0.52, 0.74]; // scroll-progress where each caption enters
const BEAT_LEN = 0.18;

export default function HeroStory({ hero, story }: { hero?: Section; story?: Section }) {
  const wrap = useRef<HTMLElement>(null);
  const heroText = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "cinematic" | "static">("pending");
  const [mobile, setMobile] = useState(false);
  const beats = ((story?.extra?.beats as string[] | undefined) ?? []).slice(0, 4);

  useEffect(() => {
    setMobile(isCoarseOrSmall());
    setMode(prefersReducedMotion() || !hasWebGL() ? "static" : "cinematic");
  }, []);

  // Hero text entrance once the preloader has cleared
  useEffect(() => {
    const el = heroText.current;
    if (!el) return;
    const targets = el.querySelectorAll("[data-hero-in]");
    gsap.set(targets, { opacity: 0, y: 36 });
    const go = () => gsap.to(targets, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.12 });
    if (prefersReducedMotion()) { gsap.set(targets, { opacity: 1, y: 0 }); return; }
    if ((window as unknown as { __siteReady?: boolean }).__siteReady) { go(); return; }
    window.addEventListener("site:ready", go, { once: true });
    const fallback = window.setTimeout(go, 4000); // safety: never leave the hero hidden
    return () => { window.removeEventListener("site:ready", go); window.clearTimeout(fallback); };
  }, []);

  // Scroll choreography: one ScrollTrigger drives both the 3D progress and the caption timeline
  useEffect(() => {
    if (mode !== "cinematic" || !wrap.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: EASE },
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => { scrollState.p = self.progress; },
        },
      });
      tl.to(heroText.current, { opacity: 0, y: -70, duration: 0.08 }, 0.02);
      gsap.utils.toArray<HTMLElement>("[data-beat]").forEach((el, i) => {
        const t = BEAT_WINDOWS[i];
        tl.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.05 }, t)
          .to(el, { opacity: 0, y: -50, duration: 0.05 }, t + BEAT_LEN);
      });
      tl.fromTo("[data-rail]", { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 1 }, 0);
    }, wrap);
    return () => { ctx.revert(); scrollState.p = 0; };
  }, [mode]);

  const cinematic = mode === "cinematic";
  return (
    <section ref={wrap} id="top" className="relative" style={{ height: cinematic ? "560vh" : "auto" }} aria-label="Product story">
      <div className={cinematic ? "sticky top-0 h-dvh overflow-hidden" : "relative"}>
        {/* glow backdrop */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 70% 40%, rgba(37,99,235,.28), transparent 70%), radial-gradient(40% 40% at 10% 90%, rgba(20,184,166,.10), transparent 70%)" }} />
        {cinematic && <PosScene mobile={mobile} />}

        {/* hero copy */}
        <div ref={heroText} className={`relative z-10 mx-auto flex max-w-6xl flex-col px-5 ${cinematic ? "h-full justify-start pb-24 pt-32 sm:justify-center sm:pt-28" : "pb-16 pt-36"}`}>
          {hero?.eyebrow && <p data-hero-in className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">{hero.eyebrow}</p>}
          <h1 data-hero-in className="max-w-3xl text-[clamp(2.8rem,8vw,6.6rem)] leading-[0.96]">{hero?.heading}</h1>
          {hero?.subheading && <p data-hero-in className="mt-6 max-w-xl text-lg text-[var(--fg-muted)]">{hero.subheading}</p>}
          <div data-hero-in className="mt-9 flex flex-wrap items-center gap-3">
            <a href={hero?.cta_link || "#contact"} className="btn btn-primary !min-h-12 !px-7 !text-base">{hero?.cta_text || "Get started"}</a>
            <a href="#pricing" className="btn btn-ghost !min-h-12 !px-6 !text-base">See pricing</a>
          </div>
          {cinematic && (
            <div data-hero-in className="absolute bottom-8 left-5 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--fg-muted)]">
              <ArrowDown size={14} className="animate-bounce" /> Scroll
            </div>
          )}
        </div>

        {/* story beats (scrubbed captions) */}
        {cinematic && (
          <div ref={beatsRef} className="pointer-events-none absolute inset-0 z-10">
            {beats.map((b, i) => (
              <div key={i} data-beat className="absolute bottom-[10%] left-5 max-w-[16rem] opacity-0 [text-shadow:0_2px_24px_rgba(5,10,22,.9)] sm:bottom-auto sm:left-[6%] sm:top-1/2 sm:max-w-[22rem] sm:-translate-y-1/2">
                <div className="serif text-6xl text-[var(--primary)]/80 sm:text-7xl">0{i + 1}</div>
                <p className="mt-1 text-2xl leading-tight sm:text-3xl">{b}</p>
              </div>
            ))}
            <div className="absolute right-4 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-white/10 sm:block">
              <div data-rail className="h-full w-px origin-top bg-[var(--primary)]" />
            </div>
          </div>
        )}
      </div>

      {/* static fallback: reduced motion / no WebGL */}
      {mode === "static" && (
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
          <PosScreenImage variant="ordering" frame="tablet" className="mx-auto max-w-3xl" />
          {story?.heading && <h2 className="mt-16 text-4xl">{story.heading}</h2>}
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {beats.map((b, i) => (
              <li key={i} className="glass rounded-2xl p-5"><span className="serif text-3xl text-[var(--primary)]">0{i + 1}</span><p className="mt-1 text-lg">{b}</p></li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
