import { describe, it, expect } from "vitest";
import {
  buildKanjiIndex,
  buildSharedKanjiEdges,
  classifyReadingMatch,
} from "../../scripts/build-graph";
import { makeNode, edgeKey } from "./fixtures";

describe("buildKanjiIndex", () => {
  it("groups word ids by kanji", () => {
    const nodes = [
      makeNode("人生", "じんせい"),
      makeNode("生活", "せいかつ"),
      makeNode("学生", "がくせい"),
    ];
    const { byKanji } = buildKanjiIndex(nodes);
    expect(byKanji.get("生")?.sort()).toEqual(["人生", "学生", "生活"]);
    expect(byKanji.get("人")).toEqual(["人生"]);
  });

  it("flags kanji exceeding BRIDGE_KANJI_MAX_WORDS as high-freq", () => {
    // BRIDGE_KANJI_MAX_WORDS = 15; create 16 words sharing 人.
    const nodes = Array.from({ length: 16 }, (_, i) => makeNode(`人${i}`, `じん${i}`));
    const { highFreqKanjiSet } = buildKanjiIndex(nodes);
    expect(highFreqKanjiSet.has("人")).toBe(true);
  });

  it("does not flag kanji at exactly the threshold", () => {
    const nodes = Array.from({ length: 15 }, (_, i) => makeNode(`人${i}`, `じん${i}`));
    const { highFreqKanjiSet } = buildKanjiIndex(nodes);
    expect(highFreqKanjiSet.has("人")).toBe(false);
  });

  it("does not duplicate a node when a kanji repeats within its word", () => {
    const { byKanji } = buildKanjiIndex([makeNode("人々の人", "ひとびとのひと")]);
    expect(byKanji.get("人")).toEqual(["人々の人"]);
  });
});

describe("buildSharedKanjiEdges", () => {
  const readingsEmpty = new Map<string, Map<string, string>>();

  it("emits one edge for two words sharing one kanji", () => {
    const { byKanji } = buildKanjiIndex([makeNode("人生", "じんせい"), makeNode("人口", "じんこう")]);
    const edges = buildSharedKanjiEdges(byKanji, readingsEmpty);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("shared-kanji");
    expect(edges[0].via).toEqual(["人"]);
    expect([edges[0].source, edges[0].target].sort()).toEqual(["人口", "人生"]);
  });

  it("emits 3 edges for 3 words sharing one kanji", () => {
    const { byKanji } = buildKanjiIndex([
      makeNode("人生", "じんせい"),
      makeNode("人口", "じんこう"),
      makeNode("人類", "じんるい"),
    ]);
    expect(buildSharedKanjiEdges(byKanji, readingsEmpty)).toHaveLength(3);
  });

  it("merges via list when a pair shares multiple kanji", () => {
    const { byKanji } = buildKanjiIndex([makeNode("時間", "じかん"), makeNode("間時", "かんじ")]);
    const edges = buildSharedKanjiEdges(byKanji, readingsEmpty);
    expect(edges).toHaveLength(1);
    expect(new Set(edges[0].via)).toEqual(new Set(["時", "間"]));
  });

  it("skips kanji exceeding BRIDGE_KANJI_MAX_WORDS", () => {
    const nodes = Array.from({ length: 16 }, (_, i) => makeNode(`人${i}`, `じん${i}`));
    const { byKanji } = buildKanjiIndex(nodes);
    expect(buildSharedKanjiEdges(byKanji, readingsEmpty)).toHaveLength(0);
  });

  it("sorts source/target deterministically", () => {
    const { byKanji } = buildKanjiIndex([makeNode("z人", "z"), makeNode("a人", "a")]);
    const edges = buildSharedKanjiEdges(byKanji, readingsEmpty);
    expect(edgeKey(edges[0])).toBe("a人__z人");
  });

  it("does not emit edges for kanji that only appear in one word", () => {
    const { byKanji } = buildKanjiIndex([makeNode("人", "ひと"), makeNode("食", "しょく")]);
    expect(buildSharedKanjiEdges(byKanji, readingsEmpty)).toHaveLength(0);
  });
});

describe("classifyReadingMatch", () => {
  const readings = (...pairs: [string, Record<string, string>][]) => {
    const m = new Map<string, Map<string, string>>();
    for (const [id, perKanji] of pairs) m.set(id, new Map(Object.entries(perKanji)));
    return m;
  };

  it("returns true when both words read the bridging kanji the same", () => {
    const r = readings(["A", { 機: "き" }], ["B", { 機: "き" }]);
    expect(classifyReadingMatch("A", "B", new Set(["機"]), r)).toBe(true);
  });

  it("returns false when readings differ", () => {
    const r = readings(["A", { 人: "ひと" }], ["B", { 人: "じん" }]);
    expect(classifyReadingMatch("A", "B", new Set(["人"]), r)).toBe(false);
  });

  it("returns false when any kanji in a multi-bridge mismatches", () => {
    const r = readings(
      ["A", { 時: "じ", 間: "かん" }],
      ["B", { 時: "じ", 間: "ま" }],
    );
    expect(classifyReadingMatch("A", "B", new Set(["時", "間"]), r)).toBe(false);
  });

  it("returns undefined when either side lacks furigana data", () => {
    const r = readings(["A", { 人: "ひと" }]);
    expect(classifyReadingMatch("A", "B", new Set(["人"]), r)).toBeUndefined();
  });

  it("returns undefined when no kanji is comparable on both sides", () => {
    const r = readings(["A", { 学: "がく" }], ["B", { 校: "こう" }]);
    expect(classifyReadingMatch("A", "B", new Set(["人"]), r)).toBeUndefined();
  });

  it("classifies gemination (がく vs がっ) as different", () => {
    const r = readings(["学校", { 学: "がっ" }], ["学生", { 学: "がく" }]);
    expect(classifyReadingMatch("学校", "学生", new Set(["学"]), r)).toBe(false);
  });
});
