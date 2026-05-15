import { describe, it, expect } from "vitest";
import {
  buildSameReadingEdges,
  buildAlternateSpellingEdges,
  buildSimilarKanjiEdges,
} from "../../scripts/build-graph";
import { makeNode } from "./fixtures";

describe("buildSameReadingEdges", () => {
  it("emits an edge for two words with the same primary reading", () => {
    const edges = buildSameReadingEdges([
      makeNode("機会", "きかい"),
      makeNode("機械", "きかい"),
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("same-reading");
    expect(edges[0].via).toEqual(["きかい"]);
  });

  it("matches via secondary-entry readings too", () => {
    const a = makeNode("a", "primaryA", {
      entries: [
        { word: "a", reading: "primaryA", glosses: ["a"] },
        { word: "a", reading: "shared", glosses: ["a2"] },
      ],
    });
    const b = makeNode("b", "primaryB", {
      entries: [
        { word: "b", reading: "primaryB", glosses: ["b"] },
        { word: "b", reading: "shared", glosses: ["b2"] },
      ],
    });
    const edges = buildSameReadingEdges([a, b]);
    expect(edges.map((e) => e.via[0])).toContain("shared");
  });

  it("emits no edge for singleton readings", () => {
    const edges = buildSameReadingEdges([
      makeNode("a", "x"),
      makeNode("b", "y"),
    ]);
    expect(edges).toHaveLength(0);
  });

  it("emits one edge per pair, not per reading shared", () => {
    // Two words sharing both their primary AND a secondary reading should
    // produce two edges (one per reading), since same-reading edges are
    // emitted per reading, not deduped across readings.
    const a = makeNode("a", "r1", {
      entries: [
        { word: "a", reading: "r1", glosses: ["a"] },
        { word: "a", reading: "r2", glosses: ["a2"] },
      ],
    });
    const b = makeNode("b", "r1", {
      entries: [
        { word: "b", reading: "r1", glosses: ["b"] },
        { word: "b", reading: "r2", glosses: ["b2"] },
      ],
    });
    const edges = buildSameReadingEdges([a, b]);
    expect(edges).toHaveLength(2);
    expect(new Set(edges.map((e) => e.via[0]))).toEqual(new Set(["r1", "r2"]));
  });
});

describe("buildAlternateSpellingEdges", () => {
  it("emits an edge when reading + first 3 glosses match", () => {
    const a = makeNode("早い", "はやい", { glosses: ["fast", "early", "quick"] });
    const b = makeNode("速い", "はやい", { glosses: ["fast", "early", "quick"] });
    const edges = buildAlternateSpellingEdges([a, b]);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("alternate-spelling");
    expect(edges[0].via).toEqual(["はやい"]);
  });

  it("does not emit when glosses diverge in first 3", () => {
    const a = makeNode("a", "はやい", { glosses: ["fast", "early", "quick"] });
    const b = makeNode("b", "はやい", { glosses: ["fast", "early", "different"] });
    expect(buildAlternateSpellingEdges([a, b])).toHaveLength(0);
  });

  it("ignores divergence after the first 3 glosses", () => {
    const a = makeNode("a", "x", { glosses: ["g1", "g2", "g3", "alpha"] });
    const b = makeNode("b", "x", { glosses: ["g1", "g2", "g3", "beta"] });
    expect(buildAlternateSpellingEdges([a, b])).toHaveLength(1);
  });

  it("emits 3 edges for a three-way alternate group", () => {
    const nodes = ["x", "y", "z"].map((id) =>
      makeNode(id, "はやい", { glosses: ["fast", "early", "quick"] }),
    );
    expect(buildAlternateSpellingEdges(nodes)).toHaveLength(3);
  });

  it("emits no edges for a singleton group", () => {
    expect(buildAlternateSpellingEdges([makeNode("a", "x", { glosses: ["g"] })])).toHaveLength(0);
  });

  it("does not link words with the same glosses but different readings", () => {
    const a = makeNode("a", "x", { glosses: ["g"] });
    const b = makeNode("b", "y", { glosses: ["g"] });
    expect(buildAlternateSpellingEdges([a, b])).toHaveLength(0);
  });
});

describe("buildSimilarKanjiEdges", () => {
  const similar = new Map<string, Set<string>>([
    ["木", new Set(["本"])],
    ["本", new Set(["木"])],
  ]);

  it("emits one edge per word-pair (not duplicated for both similar-map directions)", () => {
    const nodes = [
      makeNode("木の上", "きのうえ"),
      makeNode("本の中", "ほんのなか"),
    ];
    const edges = buildSimilarKanjiEdges(nodes, similar, new Set());
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("similar-kanji");
    expect(new Set(edges[0].via)).toEqual(new Set(["木", "本"]));
  });

  it("excludes pairs where either word contains both similar kanji", () => {
    // 木本 contains both 木 and 本 -- the similarity is internal.
    const nodes = [
      makeNode("木本", "きほん"),
      makeNode("本の中", "ほんのなか"),
    ];
    expect(buildSimilarKanjiEdges(nodes, similar, new Set())).toHaveLength(0);
  });

  it("excludes pairs when either kanji is in the high-freq set", () => {
    const nodes = [
      makeNode("木の上", "きのうえ"),
      makeNode("本の中", "ほんのなか"),
    ];
    expect(buildSimilarKanjiEdges(nodes, similar, new Set(["木"]))).toHaveLength(0);
    expect(buildSimilarKanjiEdges(nodes, similar, new Set(["本"]))).toHaveLength(0);
  });

  it("returns no edges for an empty similar map", () => {
    expect(buildSimilarKanjiEdges([makeNode("a", "x")], new Map(), new Set())).toHaveLength(0);
  });

  it("merges via when multiple similar-pairs bridge the same word-pair", () => {
    // Two confusable kanji pairs both bridging the same word-pair.
    const sim = new Map<string, Set<string>>([
      ["木", new Set(["本"])],
      ["本", new Set(["木"])],
      ["未", new Set(["末"])],
      ["末", new Set(["未"])],
    ]);
    const a = makeNode("木未", "x");
    const b = makeNode("本末", "y");
    const edges = buildSimilarKanjiEdges([a, b], sim, new Set());
    expect(edges).toHaveLength(1);
    expect(new Set(edges[0].via)).toEqual(new Set(["木", "本", "未", "末"]));
  });
});
