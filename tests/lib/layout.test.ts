import { describe, it, expect } from "vitest";
import { focusLayout } from "../../src/lib/layout";
import {
  FOCUS_LAYOUT_HIGH_N as HIGH_N,
  FOCUS_LAYOUT_RING_MULT as RING_MULT,
} from "../../src/lib/constants";

const focus = { x: 0, y: 0 };
const radius = 100;
const TOL = 1e-6;

function dist(p: { x: number; y: number }) {
  return Math.hypot(p.x - focus.x, p.y - focus.y);
}

describe("focusLayout — low N", () => {
  it("returns empty map for zero neighbors", () => {
    expect(focusLayout(focus, [], radius).size).toBe(0);
  });

  it("places a single neighbor at the given radius", () => {
    const m = focusLayout(focus, [{ id: "a", x: 100, y: 0 }], radius);
    const p = m.get("a")!;
    expect(dist(p)).toBeCloseTo(radius, 6);
  });

  it("preserves cyclic angular order across the blend", () => {
    // Three neighbors at angles 0, π/2, π. After blending, the cyclic order
    // around the circle (a → b → c counterclockwise) must be preserved -- but
    // a linear atan2 sort can wrap at ±π, so compare as a rotated sequence.
    const inputs = [
      { id: "a", x: 10, y: 0 },
      { id: "b", x: 0, y: 10 },
      { id: "c", x: -10, y: 0 },
    ];
    const m = focusLayout(focus, inputs, radius);
    const byAngle = inputs.slice().sort((x, y) => {
      const px = m.get(x.id)!, py = m.get(y.id)!;
      return Math.atan2(px.y, px.x) - Math.atan2(py.y, py.x);
    });
    const ids = byAngle.map((n) => n.id);
    // Any rotation of ["a","b","c"] is valid (cyclic order).
    expect(["abc", "bca", "cab"]).toContain(ids.join(""));
  });

  it("guards against NaN when neighbor is exactly at focus", () => {
    const m = focusLayout(focus, [{ id: "a", x: 0, y: 0 }], radius);
    const p = m.get("a")!;
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(dist(p)).toBeCloseTo(radius, 6);
  });
});

describe("focusLayout — high N (two-ring split)", () => {
  // HIGH_N = 14; use 16 neighbors to trigger the split.
  const N = HIGH_N + 2;
  const neighbors = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return { id: `n${i}`, x: 200 * Math.cos(a), y: 200 * Math.sin(a) };
  });

  it("places nodes on either the inner or outer ring", () => {
    const m = focusLayout(focus, neighbors, radius);
    const inner = radius / RING_MULT;
    const outer = radius * RING_MULT;
    for (const n of neighbors) {
      const d = dist(m.get(n.id)!);
      const onInner = Math.abs(d - inner) < TOL;
      const onOuter = Math.abs(d - outer) < TOL;
      expect(onInner || onOuter).toBe(true);
    }
  });

  it("splits roughly half-and-half (inner cap = ceil(N/2))", () => {
    const m = focusLayout(focus, neighbors, radius);
    const inner = radius / RING_MULT;
    const innerCount = neighbors.filter((n) => Math.abs(dist(m.get(n.id)!) - inner) < TOL).length;
    expect(innerCount).toBe(Math.ceil(N / 2));
  });

  it("keeps a left-side neighbor on the left side", () => {
    // Neighbor at angle ~π should remain on the negative-x side after layout.
    const neighbors2 = [
      { id: "left", x: -100, y: 0 },
      ...Array.from({ length: HIGH_N + 1 }, (_, i) => {
        const a = (i / (HIGH_N + 1)) * Math.PI; // 0..π on the upper half
        return { id: `r${i}`, x: 100 * Math.cos(a), y: 100 * Math.sin(a) };
      }),
    ];
    const m = focusLayout(focus, neighbors2, radius);
    expect(m.get("left")!.x).toBeLessThan(0);
  });
});
