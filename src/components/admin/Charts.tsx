"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr } from "@/lib/utils";

// Single series → validated blue slot 1 (palette: #2a78d6 light / #3987e5 dark). Recessive grid, thin rounded bars.
export function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { const read = () => setDark(document.documentElement.getAttribute("data-theme") === "dark"); read(); const o = new MutationObserver(read); o.observe(document.documentElement, { attributes: true }); return () => o.disconnect(); }, []);
  const total = data.reduce((n, d) => n + d.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-[var(--fg-muted)]">No payments recorded yet. Revenue appears here once you add payments.</p>;
  return (
    <div role="img" aria-label={`Monthly revenue, last 6 months: ${data.map((d) => `${d.label} ${inr(d.value)}`).join(", ")}`} className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#898781", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} width={48} tick={{ fill: "#898781", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} formatter={(v) => inr(Number(v))} contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="value" fill={dark ? "#3987e5" : "#2a78d6"} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar list: direct value labels, one hue, no legend needed for a single series. */
export function BarList({ rows, empty = "No data yet" }: { rows: { label: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-[var(--fg-muted)]">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate capitalize text-[var(--fg-muted)]">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[var(--line)]"><span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Soft realtime: refresh server data periodically while the tab is visible (session cookies are httpOnly, so no browser websocket). */
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

export function CountUp({ value, money }: { value: number; money?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    const start = performance.now(), dur = 700;
    let raf = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - start) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{money ? inr(n) : n}</>;
}
