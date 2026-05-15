// End-to-end golden-master test for the build-graph pipeline. Drives every
// edge-derivation step through a small synthetic fixture so we catch regressions
// in the pipeline glue (filter ordering, dedup sets, hidden-edge counting) in
// addition to the per-function tests.

import { describe, it, expect } from "vitest";
import {
  buildKanjiIndex,
  buildKanjiReadings,
  buildSharedKanjiEdges,
  buildSameReadingEdges,
  buildSimilarKanjiEdges,
  buildAlternateSpellingEdges,
  buildHighFreqConnections,
  type Edge,
} from "../../scripts/build-graph";
import type { FuriganaIndex } from "../../scripts/dict/furigana";
import { makeNode } from "./fixtures";

function stubFurigana(map: Record<string, [string, string][]>): FuriganaIndex {
  return {
    lookup: (word, reading) => {
      const segs = map[`${word}\0${reading}`];
      return segs ? segs.map(([ruby, rt]) => ({ ruby, rt })) : null;
    },
  };
}

describe("pipeline — synthetic fixture", () => {
  // 6 words exercising every edge type and the alt-spelling priority filter.
  const nodes = [
    makeNode("早い", "はやい", { glosses: ["fast", "quick", "early"] }), // alt with 速い
    makeNode("速い", "はやい", { glosses: ["fast", "quick", "early"] }),
    makeNode("機会", "きかい", { glosses: ["opportunity"] }), // shared-kanji 機 + same-reading きかい with 機械
    makeNode("機械", "きかい", { glosses: ["machine"] }),
    makeNode("学校", "がっこう"), // shared-kanji 学 (different reading) with 学生
    makeNode("学生", "がくせい"),
  ];

  const similar = new Map<string, Set<string>>();
  const furigana = stubFurigana({
    "学校\0がっこう": [["学", "がっ"], ["校", "こう"]],
    "学生\0がくせい": [["学", "がく"], ["生", "せい"]],
    "機会\0きかい": [["機", "き"], ["会", "かい"]],
    "機械\0きかい": [["機", "き"], ["械", "かい"]],
  });

  const { byKanji, highFreqKanjiSet } = buildKanjiIndex(nodes);
  const kanjiReadings = buildKanjiReadings(nodes, furigana);

  const altEdges = buildAlternateSpellingEdges(nodes);
  const altPairSet = new Set(altEdges.map((e) => `${e.source} ${e.target}`));
  const sharedEdges = buildSharedKanjiEdges(byKanji, kanjiReadings).filter(
    (e) => !altPairSet.has(`${e.source} ${e.target}`),
  );
  const sameReadingEdges = buildSameReadingEdges(nodes).filter(
    (e) => !altPairSet.has(`${e.source} ${e.target}`),
  );
  const similarEdges = buildSimilarKanjiEdges(nodes, similar, highFreqKanjiSet);

  const allEdges: Edge[] = [...altEdges, ...sharedEdges, ...sameReadingEdges, ...similarEdges];

  it("produces exactly the expected alternate-spelling edge", () => {
    expect(altEdges).toHaveLength(1);
    expect(altEdges[0].source).toBe("早い");
    expect(altEdges[0].target).toBe("速い");
    expect(altEdges[0].via).toEqual(["はやい"]);
  });

  it("alternate-spelling pair is removed from same-reading and shared-kanji edge lists", () => {
    // 早い/速い share reading はやい AND no kanji, so they'd produce a same-reading
    // edge if not filtered. Verify the alt edge is the ONLY edge between this pair.
    const between = allEdges.filter(
      (e) =>
        (e.source === "早い" && e.target === "速い") ||
        (e.source === "速い" && e.target === "早い"),
    );
    expect(between).toHaveLength(1);
    expect(between[0].type).toBe("alternate-spelling");
  });

  it("produces same-reading + shared-kanji edges for 機会/機械 (multi-edge between same pair)", () => {
    const between = allEdges.filter(
      (e) =>
        (e.source === "機会" && e.target === "機械") ||
        (e.source === "機械" && e.target === "機会"),
    );
    expect(new Set(between.map((e) => e.type))).toEqual(new Set(["shared-kanji", "same-reading"]));
  });

  it("classifies 機会/機械 bridging 機 as same reading", () => {
    const shared = allEdges.find((e) => e.type === "shared-kanji" && e.via.includes("機"))!;
    expect(shared.readingMatch).toBe(true);
  });

  it("classifies 学校/学生 bridging 学 as different reading (がっ vs がく)", () => {
    const shared = allEdges.find((e) => e.type === "shared-kanji" && e.via.includes("学"))!;
    expect(shared.readingMatch).toBe(false);
  });

  it("the only edges present are those expected by the fixture", () => {
    // Whole-fixture golden master: type + endpoints, sorted for stability.
    const sig = allEdges
      .map((e) => `${e.type}:${[e.source, e.target].sort().join("-")}`)
      .sort();
    expect(sig).toEqual([
      "alternate-spelling:早い-速い",
      "same-reading:機会-機械",
      "shared-kanji:学校-学生",
      "shared-kanji:機会-機械",
    ]);
  });

  it("produces no high-freq connections for this fixture", () => {
    const sharedPairSet = new Set(sharedEdges.map((e) => `${e.source} ${e.target}`));
    const { connections, hiddenShared, hiddenSimilar } = buildHighFreqConnections(
      byKanji, highFreqKanjiSet, similar, nodes, sharedPairSet,
    );
    expect(connections).toEqual([]);
    expect(hiddenShared).toBe(0);
    expect(hiddenSimilar).toBe(0);
  });
});
