import type { WordNode } from "../types";

export interface XY {
  x: number;
  y: number;
}

/**
 * Place each neighbor on a circle of `radius` around `focus`, preserving the
 * angle each neighbor had relative to the focus in the source layout. Keeps
 * rough directional context ("the one that was upper-right stays upper-right")
 * while equalizing distance.
 */
export function radialAround(
  focus: WordNode,
  neighbors: WordNode[],
  radius: number,
): Map<string, XY> {
  const fx = focus.x ?? 0;
  const fy = focus.y ?? 0;
  const out = new Map<string, XY>();

  // Compute angles, then resolve collisions by spreading equal-angle
  // neighbors apart.
  const items = neighbors.map((n) => {
    const dx = (n.x ?? 0) - fx;
    const dy = (n.y ?? 0) - fy;
    let angle = Math.atan2(dy, dx);
    if (!Number.isFinite(angle) || (dx === 0 && dy === 0)) {
      angle = Math.random() * Math.PI * 2;
    }
    return { id: n.id, angle };
  });

  items.sort((a, b) => a.angle - b.angle);
  const minGap = items.length > 1 ? Math.min(0.18, (Math.PI * 2) / items.length / 2) : 0;
  for (let i = 1; i < items.length; i++) {
    if (items[i].angle - items[i - 1].angle < minGap) {
      items[i].angle = items[i - 1].angle + minGap;
    }
  }

  for (const { id, angle } of items) {
    out.set(id, {
      x: fx + radius * Math.cos(angle),
      y: fy + radius * Math.sin(angle),
    });
  }
  return out;
}
