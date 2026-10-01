"use client";

import { useEffect, useRef } from "react";
import { drawScreen, setScreenFonts, type ScreenVariant } from "./scene/screens";

const FRAME_PAD: Record<string, string> = {
  phone: "rounded-[2rem] p-2.5",
  tablet: "rounded-[1.6rem] p-2.5 sm:p-3",
  desktop: "rounded-xl p-2",
};

/** Draws a One-Order POS screen into a device frame (used as the gallery fallback and the static hero). */
export default function PosScreenImage({ variant, frame = "tablet", className = "" }: { variant: ScreenVariant; frame?: "phone" | "tablet" | "desktop"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const paint = () => {
      const c = ref.current;
      if (!c) return;
      const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-serif").trim();
      setScreenFonts(getComputedStyle(document.body).fontFamily, serif || "Georgia, serif");
      drawScreen(c.getContext("2d")!, c.width, c.height, variant, 2);
    };
    paint();
    document.fonts?.ready.then(paint);
  }, [variant]);

  return (
    <div className={`bg-gradient-to-b from-[#1b2540] to-[#0b1224] shadow-[0_30px_80px_-20px_rgba(37,99,235,.45)] ring-1 ring-white/10 ${FRAME_PAD[frame]} ${className}`}>
      <canvas ref={ref} width={1280} height={880} className="block h-auto w-full rounded-[1rem]" role="img" aria-label={`${variant} screen of the One-Order POS`} />
    </div>
  );
}
