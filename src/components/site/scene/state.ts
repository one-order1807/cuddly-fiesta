// Mutable scroll progress (0..1) of the pinned story. Written by GSAP ScrollTrigger, read every frame by the 3D rig.
// Deliberately NOT React state: updating it must never trigger a re-render.
export const scrollState = { p: 0 };
