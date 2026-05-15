import { describe, it, expect } from "vitest";
import { toRomaji } from "wanakana";
import { matchesQuery, resultScore, matchingEntryIdx, matchedReading } from "../../src/lib/search";
import type { WordNode, WordEntry } from "../../src/types";

function node(word: string, entries: WordEntry[], extras: Partial<WordNode> = {}): WordNode {
  return {
    id: word,
    word,
    reading: entries[0].reading,
    glosses: entries[0].glosses,
    entries,
    kanji: [],
    ...extras,
  };
}

const score = (n: WordNode, q: string) => resultScore(n, q, q.toLowerCase(), []);

describe("resultScore — tier ordering", () => {
  it("exact kana match scores 0", () => {
    const n = node("人", [{ reading: "ひと", glosses: ["person"] }]);
    expect(score(n, "ひと")).toBe(0);
    expect(score(n, "人")).toBe(0);
  });

  it("kana starts-with scores 1", () => {
    const n = node("人生", [{ reading: "じんせい", glosses: ["life"] }]);
    expect(score(n, "じん")).toBe(1);
  });

  it("kana contains scores 2", () => {
    const n = node("人生", [{ reading: "じんせい", glosses: ["life"] }]);
    expect(score(n, "んせ")).toBe(2);
  });

  it("exact romaji scores 3", () => {
    const n = node("人", [{ reading: "じん", glosses: ["person"] }]);
    // "jin" is romaji of "じん"; kana doesn't match
    expect(score(n, "jin")).toBe(3);
  });

  it("romaji starts-with scores 4", () => {
    const n = node("人生", [{ reading: "じんせい", glosses: ["life"] }]);
    expect(score(n, "jinse")).toBe(4);
  });

  it("romaji contains scores 5", () => {
    const n = node("人生", [{ reading: "じんせい", glosses: ["life"] }]);
    expect(score(n, "nse")).toBe(5);
  });

  it("deinflected match scores 6", () => {
    const n = node("食べる", [{ reading: "たべる", glosses: ["eat"] }]);
    // "食べた" deinflects to "食べる"; pass that as qForm.
    expect(resultScore(n, "食べた", "食べた", ["食べる"])).toBe(6);
  });

  it("no match at all scores 7", () => {
    const n = node("人", [{ reading: "ひと", glosses: ["person"] }]);
    expect(score(n, "xyz")).toBe(7);
  });

  it("romaji exact beats romaji prefix (jin = じん over じんせい-prefix)", () => {
    const exact = node("人", [{ reading: "じん", glosses: ["person"] }]);
    const prefix = node("人生", [{ reading: "じんせい", glosses: ["life"] }]);
    expect(score(exact, "jin")).toBeLessThan(score(prefix, "jin"));
  });
});

describe("resultScore — secondary entries", () => {
  it("uses secondary readings (人 has ひと/じん/にん)", () => {
    const n = node("人", [
      { reading: "ひと", glosses: ["person"] },
      { reading: "じん", glosses: ["-jin"] },
      { reading: "にん", glosses: ["-nin"] },
    ]);
    expect(score(n, "にん")).toBe(0);
  });
});

describe("matchesQuery", () => {
  it("matches word, reading, romaji, and deinflected form", () => {
    const n = node("食べる", [{ reading: "たべる", glosses: ["eat"] }]);
    expect(matchesQuery(n, "食べる", "食べる", [])).toBe(true);
    expect(matchesQuery(n, "たべる", "たべる", [])).toBe(true);
    expect(matchesQuery(n, "tabe", "tabe", [])).toBe(true);
    expect(matchesQuery(n, "食べた", "食べた", ["食べる"])).toBe(true);
    expect(matchesQuery(n, "zzz", "zzz", [])).toBe(false);
  });
});

describe("matchingEntryIdx", () => {
  const n = node("人", [
    { reading: "ひと", glosses: ["person"] },
    { reading: "じん", glosses: ["-jin"] },
    { reading: "にん", glosses: ["-nin"] },
  ]);

  it("returns the index of the exact-matching reading", () => {
    expect(matchingEntryIdx(n, "じん", toRomaji("じん").toLowerCase())).toBe(1);
    expect(matchingEntryIdx(n, "にん", toRomaji("にん").toLowerCase())).toBe(2);
  });

  it("falls back to romaji match", () => {
    expect(matchingEntryIdx(n, "nin", "nin")).toBe(2);
  });

  it("returns 0 when nothing matches", () => {
    expect(matchingEntryIdx(n, "xyz", "xyz")).toBe(0);
  });

  it("prefers higher-quality match over earlier index", () => {
    // query "ひと" is exact in entry 0, prefix in entry 1's "ひとびと"
    const m = node("人々", [
      { reading: "ひとびと", glosses: ["people"] },
      { reading: "ひと", glosses: ["exact"] },
    ]);
    // exact match wins over prefix even though prefix is at index 0
    expect(matchingEntryIdx(m, "ひと", "ひと")).toBe(1);
  });
});

describe("matchedReading", () => {
  it("returns primary reading when primary matches", () => {
    const n = node("人", [
      { reading: "ひと", glosses: ["person"] },
      { reading: "じん", glosses: ["-jin"] },
    ]);
    expect(matchedReading(n, "ひと", "ひと")).toBe("ひと");
  });

  it("returns the matching secondary reading", () => {
    const n = node("人", [
      { reading: "ひと", glosses: ["person"] },
      { reading: "じん", glosses: ["-jin"] },
    ]);
    expect(matchedReading(n, "じん", "じん")).toBe("じん");
  });

  it("falls back to primary if nothing matches", () => {
    const n = node("人", [{ reading: "ひと", glosses: ["person"] }]);
    expect(matchedReading(n, "xyz", "xyz")).toBe("ひと");
  });
});
