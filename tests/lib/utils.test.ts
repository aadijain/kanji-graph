import { describe, it, expect } from "vitest";
import { getNodeEntries } from "../../src/lib/utils";
import type { WordNode } from "../../src/types";

const base: WordNode = {
  id: "人",
  word: "人",
  reading: "ひと",
  glosses: ["person"],
  entries: [],
  kanji: ["人"],
};

describe("getNodeEntries", () => {
  it("returns node.entries when present and non-empty", () => {
    const entries = [
      { reading: "ひと", glosses: ["person"] },
      { reading: "じん", glosses: ["-jin"] },
    ];
    expect(getNodeEntries({ ...base, entries })).toBe(entries);
  });

  it("synthesizes a single entry from top-level fields when entries is empty", () => {
    const result = getNodeEntries({ ...base, entries: [], jlpt: 4 });
    expect(result).toEqual([{ reading: "ひと", glosses: ["person"], jlpt: 4 }]);
  });

  it("handles missing glosses by returning an empty array", () => {
    // @ts-expect-error -- testing a partial node from a legacy graph.json
    const result = getNodeEntries({ ...base, entries: [], glosses: undefined });
    expect(result[0].glosses).toEqual([]);
  });
});
