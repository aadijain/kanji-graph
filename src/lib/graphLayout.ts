import { type WordNode } from "../types";
import {
  LAYOUT_STORAGE_KEY,
  FONT_FAMILY,
  FREQ_DOT_MIN,
  FREQ_DOT_MAX,
  FREQ_LOG_MAX,
} from "./constants";

export type Pos = { id: string; x: number; y: number };

// d3Force() returns `object | undefined`; the library types omit the actual
// D3 force API. These slices cover what we use and avoid `as any`.
export type D3LinkForce   = { distance(d: number): void };
export type D3ChargeForce = { strength(s: number): void };

export function freqDotR(rank: number): number {
  const normalized = Math.max(0, 1 - Math.log(rank) / Math.log(FREQ_LOG_MAX));
  return FREQ_DOT_MIN + (FREQ_DOT_MAX - FREQ_DOT_MIN) * Math.pow(normalized, 0.7);
}

export function loadLayout(): Map<string, Pos> {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return new Map();
    const arr: Pos[] = JSON.parse(raw);
    return new Map(arr.map((p) => [p.id, p]));
  } catch {
    return new Map();
  }
}

export function saveLayout(nodes: WordNode[]) {
  const arr: Pos[] = nodes
    .filter((n) => typeof n.x === "number" && typeof n.y === "number")
    .map((n) => ({ id: n.id, x: n.x!, y: n.y! }));
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(arr));
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  word: string,
  cx: number,
  cy: number,
  fontSize: number,
  baseColor: string,
  weight: number,
  highlights?: Map<string, string>,
) {
  const chars = [...word];
  ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    ctx.fillStyle = highlights?.get(ch) ?? baseColor;
    ctx.fillText(ch, x, cy);
    x += widths[i];
  }
}
