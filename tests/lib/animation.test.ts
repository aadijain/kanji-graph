import { describe, it, expect } from "vitest";
import { easeInOutCubic } from "../../src/lib/animation";

describe("easeInOutCubic", () => {
  it("is 0 at t=0", () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  it("is 1 at t=1", () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("is 0.5 at t=0.5 (midpoint symmetry)", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it("is monotonically non-decreasing", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const v = easeInOutCubic(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("is symmetric around t=0.5 (f(t) + f(1-t) = 1)", () => {
    for (const t of [0.1, 0.25, 0.4, 0.49]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 10);
    }
  });
});
