import { describe, it, expect } from "vitest";
import { endpointId, edgeId } from "../../src/types";
import type { Edge, WordNode } from "../../src/types";

const stubNode = (id: string): WordNode => ({
  id, word: id, reading: "", glosses: [], entries: [], kanji: [],
});

describe("endpointId", () => {
  it("returns string endpoint unchanged", () => {
    expect(endpointId("人")).toBe("人");
  });

  it("returns .id on WordNode endpoints", () => {
    expect(endpointId(stubNode("食べる"))).toBe("食べる");
  });
});

describe("edgeId", () => {
  it("formats string endpoints as src__dst", () => {
    const e: Edge = { source: "a", target: "b", type: "shared-kanji", via: [] };
    expect(edgeId(e)).toBe("a__b");
  });

  it("uses .id when endpoints are nodes", () => {
    const e: Edge = { source: stubNode("a"), target: stubNode("b"), type: "shared-kanji", via: [] };
    expect(edgeId(e)).toBe("a__b");
  });

  it("preserves source/target order (not sorted)", () => {
    const e: Edge = { source: "z", target: "a", type: "shared-kanji", via: [] };
    expect(edgeId(e)).toBe("z__a");
  });
});
