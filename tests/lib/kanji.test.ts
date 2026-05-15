import { describe, it, expect } from "vitest";
import { KANJI_RE } from "../../src/lib/constants";

describe("KANJI_RE", () => {
  it("matches common CJK ideographs", () => {
    for (const ch of ["人", "日", "本", "学", "鬱", "一", "鿿"]) {
      expect(KANJI_RE.test(ch)).toBe(true);
    }
  });

  it("rejects hiragana, katakana, and ASCII", () => {
    for (const ch of ["あ", "ア", "a", "Z", "0", "！", " "]) {
      expect(KANJI_RE.test(ch)).toBe(false);
    }
  });

  it("does not match the kanji-followed-by-okurigana boundary chars", () => {
    // 々 (iteration mark) is outside CJK Unified — explicit because it shows up in 人々.
    expect(KANJI_RE.test("々")).toBe(false);
  });
});

describe("[...word] iteration for kanji extraction", () => {
  const isKanji = (ch: string) => KANJI_RE.test(ch);
  const kanjiOf = (w: string) => [...w].filter(isKanji);

  it("extracts kanji from a mixed word", () => {
    expect(kanjiOf("食べる")).toEqual(["食"]);
    expect(kanjiOf("勉強する")).toEqual(["勉", "強"]);
  });

  it("preserves duplicate kanji", () => {
    expect(kanjiOf("人々の人")).toEqual(["人", "人"]);
  });

  it("returns empty for kana-only words", () => {
    expect(kanjiOf("ありがとう")).toEqual([]);
  });
});
