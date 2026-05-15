import { describe, it, expect } from "vitest";
import { getEdgeStyle, controlPointOf } from "../../src/lib/edgeStyles";
import { EDGE_STYLE } from "../../src/lib/constants";
import type { Edge } from "../../src/types";

function edge(partial: Partial<Edge> & Pick<Edge, "type">): Edge {
  return { source: "a", target: "b", via: [], ...partial };
}

describe("getEdgeStyle", () => {
  it("dashes shared-kanji edges with readingMatch=false", () => {
    expect(getEdgeStyle(edge({ type: "shared-kanji", readingMatch: false }))).toBe("dashed");
  });

  it("uses per-type style for shared-kanji with readingMatch=true", () => {
    expect(getEdgeStyle(edge({ type: "shared-kanji", readingMatch: true }))).toBe(EDGE_STYLE["shared-kanji"]);
  });

  it("uses per-type style for shared-kanji with readingMatch undefined", () => {
    expect(getEdgeStyle(edge({ type: "shared-kanji" }))).toBe(EDGE_STYLE["shared-kanji"]);
  });

  it("returns the EDGE_STYLE entry for every non-shared-kanji type", () => {
    for (const type of ["same-reading", "similar-kanji", "alternate-spelling"] as const) {
      expect(getEdgeStyle(edge({ type }))).toBe(EDGE_STYLE[type]);
    }
  });

  it("ignores readingMatch on non-shared-kanji types", () => {
    expect(getEdgeStyle(edge({ type: "same-reading", readingMatch: false }))).toBe(EDGE_STYLE["same-reading"]);
  });
});

describe("controlPointOf", () => {
  it("returns null when __controlPoints is absent", () => {
    expect(controlPointOf({})).toBeNull();
  });

  it("returns null when __controlPoints is null", () => {
    expect(controlPointOf({ __controlPoints: null })).toBeNull();
  });

  it("returns null when __controlPoints is too short", () => {
    expect(controlPointOf({ __controlPoints: [1] })).toBeNull();
  });

  it("returns {x,y} from the first two array entries", () => {
    expect(controlPointOf({ __controlPoints: [3, 4, 99] })).toEqual({ x: 3, y: 4 });
  });

  it("doesn't throw on objects without the field", () => {
    expect(() => controlPointOf({ source: "a", target: "b" })).not.toThrow();
    expect(controlPointOf({ source: "a", target: "b" })).toBeNull();
  });
});
