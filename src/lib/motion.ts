// One easing curve and one duration scale for the whole site (consistency = the "award-site" feel).
export const EASE = "power3.inOut";
export const EASE_OUT = "power3.out";
export const DURATION = { fast: 0.3, base: 0.6, slow: 1.1 } as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isCoarseOrSmall = () =>
  typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);

export function hasWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
