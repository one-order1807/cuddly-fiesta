// Procedural One-Order POS screens drawn on a 2D canvas.
// Used as the live texture on the 3D tablet and as the gallery fallback (so the site never ships a fake photo).

export type ScreenVariant = "ordering" | "tables" | "kitchen" | "billing";

let SANS = "system-ui, sans-serif";
let SERIF = "Georgia, serif";
export function setScreenFonts(sans: string, serif: string) { SANS = sans; SERIF = serif; }

const C = {
  bg: "#f5f8fc", card: "#ffffff", ink: "#0f172a", muted: "#64748b", line: "#e2e8f0",
  primary: "#2563eb", teal: "#14b8a6", amber: "#f59e0b", coral: "#f97316", green: "#22c55e", red: "#ef4444",
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = C.ink, weight = 600, align: CanvasTextAlign = "left") {
  ctx.font = `${weight} ${size}px ${SANS}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
}

function topBar(ctx: CanvasRenderingContext2D, w: number, title: string) {
  ctx.fillStyle = C.card;
  ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = C.line;
  ctx.fillRect(0, 63, w, 1);
  ctx.font = `400 30px ${SERIF}`;
  ctx.fillStyle = C.primary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("One-Order", 28, 33);
  text(ctx, title, w / 2, 33, 20, C.ink, 600, "center");
  rr(ctx, w - 190, 18, 160, 30, 15);
  ctx.fillStyle = "#dcfce7";
  ctx.fill();
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.arc(w - 170, 33, 5, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, "Printer connected", w - 156, 33, 13, "#166534", 600);
}

const ITEMS = [
  ["Masala Dosa", "₹90", C.amber], ["Filter Coffee", "₹40", C.coral], ["Masala Tea", "₹25", C.teal],
  ["Idli Sambar", "₹60", C.primary], ["Cold Coffee", "₹80", C.coral], ["Veg Sandwich", "₹70", C.amber],
] as const;

function ordering(ctx: CanvasRenderingContext2D, w: number, h: number, stage: number) {
  topBar(ctx, w, "New order");
  // category bar
  ["All", "Breakfast", "Beverages", "Snacks", "Desserts"].forEach((c, i) => {
    const x = 28 + i * 118;
    rr(ctx, x, 84, 104, 36, 18);
    ctx.fillStyle = i === 0 ? C.primary : C.card;
    ctx.fill();
    text(ctx, c, x + 52, 102, 14, i === 0 ? "#fff" : C.muted, 600, "center");
  });
  // item grid
  const gw = w - 380;
  ITEMS.forEach(([name, price, col], i) => {
    const cw = (gw - 28 * 2 - 16 * 2) / 3;
    const x = 28 + (i % 3) * (cw + 16);
    const y = 140 + Math.floor(i / 3) * 190;
    rr(ctx, x, y, cw, 172, 16);
    ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    rr(ctx, x + 14, y + 14, cw - 28, 74, 12); ctx.fillStyle = col + "26"; ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + cw / 2, y + 51, 22, 0, Math.PI * 2); ctx.fill();
    text(ctx, name, x + 16, y + 112, 17, C.ink, 700);
    text(ctx, price, x + 16, y + 140, 16, C.muted, 600);
    rr(ctx, x + cw - 50, y + 124, 34, 34, 17); ctx.fillStyle = C.primary; ctx.fill();
    text(ctx, "+", x + cw - 33, y + 141, 22, "#fff", 700, "center");
  });
  // order panel
  const px = w - 340;
  ctx.fillStyle = C.card; ctx.fillRect(px, 64, 340, h - 64);
  ctx.fillStyle = C.line; ctx.fillRect(px, 64, 1.5, h - 64);
  text(ctx, "Table 5", px + 24, 100, 22, C.ink, 700);
  text(ctx, stage > 0 ? "12m" : "new", px + 316, 100, 14, C.muted, 600, "right");
  const lines = stage === 0 ? [] : stage === 1 ? [["Dosa ×3", "₹270"], ["Tea ×3", "₹75"]] : [["Round 1 · Dosa ×3", "₹270"], ["Round 1 · Tea ×3", "₹75"], ["Round 2 · Dosa ×2", "₹180"], ["Round 2 · Tea ×5", "₹125"]];
  if (!lines.length) text(ctx, "Tap an item to start", px + 170, 220, 15, C.muted, 500, "center");
  lines.forEach(([a, b], i) => { text(ctx, a, px + 24, 148 + i * 44, 16, C.ink, 600); text(ctx, b, px + 316, 148 + i * 44, 16, C.muted, 600, "right"); });
  rr(ctx, px + 24, h - 150, 292, 52, 14); ctx.fillStyle = stage > 0 ? C.amber : C.line; ctx.fill();
  text(ctx, "Cook Bill", px + 170, h - 124, 18, stage > 0 ? "#fff" : C.muted, 700, "center");
  rr(ctx, px + 24, h - 86, 292, 52, 14); ctx.fillStyle = stage > 1 ? C.primary : C.line; ctx.fill();
  text(ctx, "Customer Bill", px + 170, h - 60, 18, stage > 1 ? "#fff" : C.muted, 700, "center");
}

function tables(ctx: CanvasRenderingContext2D, w: number, _h: number) {
  topBar(ctx, w, "Tables");
  const occupied = new Set([1, 4, 6, 9, 10]);
  for (let i = 0; i < 12; i++) {
    const cw = (w - 56 - 16 * 3) / 4, ch = 150;
    const x = 28 + (i % 4) * (cw + 16), y = 96 + Math.floor(i / 4) * (ch + 16);
    const occ = occupied.has(i);
    rr(ctx, x, y, cw, ch, 18);
    ctx.fillStyle = occ ? "#fee2e2" : "#dcfce7"; ctx.fill();
    ctx.strokeStyle = occ ? C.red : C.green; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, `T${i + 1}`, x + 20, y + 40, 26, C.ink, 700);
    text(ctx, occ ? "Occupied" : "Free", x + 20, y + 80, 15, occ ? "#991b1b" : "#166534", 600);
    if (occ) text(ctx, `${(i * 7) % 40 + 4}m`, x + cw - 20, y + 40, 16, "#991b1b", 700, "right");
  }
}

function kitchen(ctx: CanvasRenderingContext2D, w: number, _h: number) {
  topBar(ctx, w, "Kitchen");
  const tickets = [["T5 · Round 2", ["Dosa ×2", "Tea ×5"], C.amber], ["T9", ["Idli ×4", "Filter Coffee ×2"], C.primary], ["Takeaway #23", ["Sandwich ×1", "Cold Coffee ×1"], C.teal]] as const;
  tickets.forEach(([title, lines, col], i) => {
    const cw = (w - 56 - 32) / 3, x = 28 + i * (cw + 16);
    rr(ctx, x, 96, cw, 330, 18); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    rr(ctx, x, 96, cw, 52, 18); ctx.fillStyle = col; ctx.fill();
    text(ctx, title, x + 18, 123, 18, "#fff", 700);
    lines.forEach((l, j) => text(ctx, l, x + 20, 180 + j * 44, 20, C.ink, 600));
    rr(ctx, x + 18, 360, cw - 36, 44, 12); ctx.fillStyle = C.primary + "1f"; ctx.fill();
    text(ctx, "Mark ready", x + cw / 2, 382, 16, C.primary, 700, "center");
  });
}

function billing(ctx: CanvasRenderingContext2D, w: number, h: number) {
  topBar(ctx, w, "Customer Bill");
  const bw = 420, bx = (w - bw) / 2;
  rr(ctx, bx, 88, bw, h - 112, 14); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
  ctx.font = `400 30px ${SERIF}`; ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.fillText("Your Café", w / 2, 130);
  text(ctx, "Table 5", w / 2, 160, 14, C.muted, 500, "center");
  [["Dosa  ×5", "₹450"], ["Tea  ×8", "₹200"]].forEach(([a, b], i) => { text(ctx, a, bx + 32, 220 + i * 40, 18, C.ink, 600); text(ctx, b, bx + bw - 32, 220 + i * 40, 18, C.ink, 600, "right"); });
  ctx.fillStyle = C.line; ctx.fillRect(bx + 32, 320, bw - 64, 1.5);
  text(ctx, "Total", bx + 32, 358, 22, C.ink, 700); text(ctx, "₹650", bx + bw - 32, 358, 22, C.primary, 700, "right");
  rr(ctx, bx + 32, h - 120, bw - 64, 52, 14); ctx.fillStyle = C.primary; ctx.fill();
  text(ctx, "Print & close table", w / 2, h - 94, 18, "#fff", 700, "center");
}

export function drawScreen(ctx: CanvasRenderingContext2D, w: number, h: number, variant: ScreenVariant, stage = 1) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  if (variant === "ordering") ordering(ctx, w, h, stage);
  else if (variant === "tables") tables(ctx, w, h);
  else if (variant === "kitchen") kitchen(ctx, w, h);
  else billing(ctx, w, h);
}
