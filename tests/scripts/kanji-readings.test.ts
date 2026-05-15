import { describe, it, expect } from "vitest";
import { buildKanjiReadings } from "../../scripts/build-graph";
import type { FuriganaIndex, FuriganaSegment } from "../../scripts/dict/furigana";
import { makeNode } from "./fixtures";

function stubFurigana(entries: Record<string, FuriganaSegment[]>): FuriganaIndex {
  return {
    lookup: (word, reading) => entries[`${word}\0${reading}`] ?? null,
  };
}

describe("buildKanjiReadings", () => {
  it("maps single-kanji ruby segments to their readings", () => {
    const fur = stubFurigana({
      "人生\0じんせい": [
        { ruby: "人", rt: "じん" },
        { ruby: "生", rt: "せい" },
      ],
    });
    const result = buildKanjiReadings([makeNode("人生", "じんせい")], fur);
    expect(result.get("人生")?.get("人")).toBe("じん");
    expect(result.get("人生")?.get("生")).toBe("せい");
  });

  it("skips multi-character ruby chunks (jukujikun like 大人=おとな)", () => {
    const fur = stubFurigana({
      "大人\0おとな": [{ ruby: "大人", rt: "おとな" }],
    });
    const result = buildKanjiReadings([makeNode("大人", "おとな")], fur);
    expect(result.has("大人")).toBe(false);
  });

  it("drops nodes with no usable segments", () => {
    const fur = stubFurigana({
      "あいう\0あいう": [{ ruby: "あいう", rt: "" }],
    });
    const result = buildKanjiReadings([makeNode("あいう", "あいう")], fur);
    expect(result.has("あいう")).toBe(false);
  });

  it("skips nodes missing from the furigana index", () => {
    const fur = stubFurigana({});
    const result = buildKanjiReadings([makeNode("人生", "じんせい")], fur);
    expect(result.has("人生")).toBe(false);
  });

  it("when a kanji repeats within a word, last-wins (documented lossy case)", () => {
    const fur = stubFurigana({
      "人々\0ひとびと": [
        { ruby: "人", rt: "ひと" },
        { ruby: "々", rt: "びと" }, // contrived; 々 isn't a kanji per KANJI_RE so this is skipped
        { ruby: "人", rt: "びと" },
      ],
    });
    const result = buildKanjiReadings([makeNode("人々", "ひとびと")], fur);
    expect(result.get("人々")?.get("人")).toBe("びと"); // second 人 segment wins
  });

  it("ignores kana-only segments", () => {
    const fur = stubFurigana({
      "食べる\0たべる": [
        { ruby: "食", rt: "た" },
        { ruby: "べる", rt: "べる" }, // ruby starts with kana, not kanji
      ],
    });
    const result = buildKanjiReadings([makeNode("食べる", "たべる")], fur);
    expect(result.get("食べる")?.size).toBe(1);
    expect(result.get("食べる")?.get("食")).toBe("た");
  });
});
