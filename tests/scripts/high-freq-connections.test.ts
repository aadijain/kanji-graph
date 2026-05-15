import { describe, it, expect } from "vitest";
import { buildKanjiIndex, buildHighFreqConnections } from "../../scripts/build-graph";
import { makeNode } from "./fixtures";

describe("buildHighFreqConnections — shared-kanji side", () => {
  // Create 17 words sharing 人 so 人 lands in the high-freq set
  // (threshold = BRIDGE_KANJI_MAX_WORDS = 15).
  const hubNodes = Array.from({ length: 17 }, (_, i) => makeNode(`人${i}`, `じん${i}`));

  it("emits one connection per high-freq kanji with perWordCount = N-1", () => {
    const { byKanji, highFreqKanjiSet } = buildKanjiIndex(hubNodes);
    const { connections, hiddenShared } = buildHighFreqConnections(
      byKanji, highFreqKanjiSet, new Map(), hubNodes, new Set(),
    );
    const sharedConn = connections.find((c) => c.type === "shared-kanji" && c.kanji === "人")!;
    expect(sharedConn).toBeDefined();
    expect(sharedConn.perWordCount).toBe(16);
    expect(sharedConn.words).toHaveLength(17);
    expect(hiddenShared).toBe((17 * 16) / 2); // pair count for 17 words
  });

  it("subtracts pairs that already have a non-hub shared-kanji edge", () => {
    const { byKanji, highFreqKanjiSet } = buildKanjiIndex(hubNodes);
    const alreadyCovered = new Set<string>();
    // Mark one pair as already covered.
    const [a, b] = ["人0", "人1"].sort();
    alreadyCovered.add(`${a} ${b}`);
    const { hiddenShared } = buildHighFreqConnections(
      byKanji, highFreqKanjiSet, new Map(), hubNodes, alreadyCovered,
    );
    expect(hiddenShared).toBe((17 * 16) / 2 - 1);
  });

  it("omits the connection entirely when every pair is already covered", () => {
    // Two-word hub (artificially marked high-freq) where the single pair is covered.
    const nodes = [makeNode("A人", "x"), makeNode("B人", "y")];
    const { byKanji } = buildKanjiIndex(nodes);
    const highFreq = new Set(["人"]);
    const covered = new Set(["A人 B人"]);
    const { connections, hiddenShared } = buildHighFreqConnections(
      byKanji, highFreq, new Map(), nodes, covered,
    );
    expect(connections.find((c) => c.kanji === "人")).toBeUndefined();
    expect(hiddenShared).toBe(0);
  });
});

describe("buildHighFreqConnections — similar-kanji side", () => {
  const similar = new Map<string, Set<string>>([
    ["木", new Set(["本"])],
    ["本", new Set(["木"])],
  ]);

  it("emits two connections per similar pair (one per side)", () => {
    const nodes = [makeNode("木A", "a"), makeNode("本B", "b")];
    const { byKanji } = buildKanjiIndex(nodes);
    const { connections } = buildHighFreqConnections(
      byKanji, new Set(["木"]), similar, nodes, new Set(),
    );
    const sides = connections.filter((c) => c.type === "similar-kanji");
    expect(sides).toHaveLength(2);
    const kSide = sides.find((c) => c.kanji === "木")!;
    const bSide = sides.find((c) => c.kanji === "本")!;
    expect(kSide.partnerKanji).toBe("本");
    expect(bSide.partnerKanji).toBe("木");
    // perWordCount reflects the opposite side
    expect(kSide.perWordCount).toBe(1);
    expect(bSide.perWordCount).toBe(1);
  });

  it("excludes words containing both similar kanji from both sides", () => {
    // 木本 has both; it shouldn't be counted on either side.
    const nodes = [makeNode("木本", "x"), makeNode("木A", "a"), makeNode("本B", "b")];
    const { byKanji } = buildKanjiIndex(nodes);
    const { connections } = buildHighFreqConnections(
      byKanji, new Set(["木"]), similar, nodes, new Set(),
    );
    const kSide = connections.find((c) => c.type === "similar-kanji" && c.kanji === "木")!;
    expect(kSide.words).toEqual(["木A"]);
    expect(kSide.words).not.toContain("木本");
  });

  it("requires at least one side to be high-freq", () => {
    const nodes = [makeNode("木A", "a"), makeNode("本B", "b")];
    const { byKanji } = buildKanjiIndex(nodes);
    // Neither 木 nor 本 is high-freq.
    const { connections } = buildHighFreqConnections(
      byKanji, new Set(), similar, nodes, new Set(),
    );
    expect(connections.filter((c) => c.type === "similar-kanji")).toHaveLength(0);
  });

  it("processes each similar pair exactly once (k1 < k2)", () => {
    const nodes = [makeNode("木A", "a"), makeNode("本B", "b")];
    const { byKanji } = buildKanjiIndex(nodes);
    const { connections } = buildHighFreqConnections(
      byKanji, new Set(["木"]), similar, nodes, new Set(),
    );
    // similar map has 木→本 AND 本→木 entries; should still emit only 2 connections, not 4.
    expect(connections.filter((c) => c.type === "similar-kanji")).toHaveLength(2);
  });
});
