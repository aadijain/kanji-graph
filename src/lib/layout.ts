import {
  FOCUS_LAYOUT_HIGH_N as HIGH_N,
  FOCUS_LAYOUT_RING_MULT as RING_RADIUS_MULT,
  FOCUS_LAYOUT_BLEND as BLEND,
} from "./constants";

export interface XY {
  x: number;
  y: number;
}

export interface NeighborSpec {
  id: string;
  x: number;
  y: number;
}

type RingItem = { id: string; angle: number };

// Place nodes with angles blended between their original angle and an evenly-
// spaced ring. Angles are unwrapped to a monotone sequence first so the
// interpolation is purely linear -- no modular arithmetic, no wraparound --
// and angular order is guaranteed to be preserved for any blend in [0, 1].
function placeBlended(items: RingItem[], cx: number, cy: number, radius: number, out: Map<string, XY>) {
  const n = items.length;
  if (n === 0) return;

  const sorted = [...items].sort((a, b) => a.angle - b.angle);

  // Unwrap to a monotonically increasing sequence.
  const unwrapped: number[] = [sorted[0].angle];
  for (let i = 1; i < n; i++) {
    let a = sorted[i].angle;
    while (a < unwrapped[i - 1]) a += Math.PI * 2;
    unwrapped.push(a);
  }

  const mean = unwrapped.reduce((s, a) => s + a, 0) / n;
  const step = (Math.PI * 2) / n;
  const start = mean - ((n - 1) / 2) * step;

  for (let i = 0; i < n; i++) {
    const even = start + i * step;
    const a = unwrapped[i] + BLEND * (even - unwrapped[i]);
    out.set(sorted[i].id, { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  }
}

export function focusLayout(
  focus: { x: number; y: number },
  neighbors: NeighborSpec[],
  radius: number,
): Map<string, XY> {
  const out = new Map<string, XY>();
  const n = neighbors.length;
  if (n === 0) return out;

  const fx = focus.x;
  const fy = focus.y;

  const items: RingItem[] = neighbors.map((nb) => {
    const dx = nb.x - fx;
    const dy = nb.y - fy;
    const a = Math.atan2(dy, dx);
    return {
      id: nb.id,
      angle: Number.isFinite(a) && (dx !== 0 || dy !== 0) ? a : Math.random() * Math.PI * 2,
    };
  });

  // High N: Bresenham-interleave onto two concentric rings by angle so each
  // ring covers the full angular range, then blend-place on each ring.
  if (n > HIGH_N) {
    const innerCap = Math.ceil(n / 2);
    const byAngle = [...items].sort((a, b) => a.angle - b.angle);
    const inner: RingItem[] = [];
    const outer: RingItem[] = [];
    for (let i = 0; i < n; i++) {
      const goInner = Math.floor((i + 1) * innerCap / n) > Math.floor(i * innerCap / n);
      (goInner ? inner : outer).push(byAngle[i]);
    }
    placeBlended(inner, fx, fy, radius / RING_RADIUS_MULT, out);
    placeBlended(outer, fx, fy, radius * RING_RADIUS_MULT, out);
    return out;
  }

  placeBlended(items, fx, fy, radius, out);
  return out;
}
