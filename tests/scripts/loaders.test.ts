import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readWordList, loadSimilarKanji } from "../../scripts/build-graph";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kanji-graph-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readWordList", () => {
  it("strips comments and blanks, trims whitespace", () => {
    const f = join(dir, "words.txt");
    writeFileSync(f, "# header\n人\n\n  食べる  \n# trailing comment\n書く\n");
    expect(readWordList(f)).toEqual(["人", "食べる", "書く"]);
  });

  it("tolerates CRLF line endings", () => {
    const f = join(dir, "words.txt");
    writeFileSync(f, "人\r\n食べる\r\n");
    // Trim removes the trailing \r, so both words come through.
    expect(readWordList(f)).toEqual(["人", "食べる"]);
  });

  it("returns empty array for an empty file", () => {
    const f = join(dir, "words.txt");
    writeFileSync(f, "");
    expect(readWordList(f)).toEqual([]);
  });
});

describe("loadSimilarKanji", () => {
  it("expands a group line into all symmetric intra-group pairs", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "木\t本\t末\n");
    const m = loadSimilarKanji(f);
    expect(m.get("木")).toEqual(new Set(["本", "末"]));
    expect(m.get("本")).toEqual(new Set(["木", "末"]));
    expect(m.get("末")).toEqual(new Set(["木", "本"]));
  });

  it("supports four-char groups (6 pairs)", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "木\t本\t末\t未\n");
    const m = loadSimilarKanji(f);
    expect(m.get("木")).toEqual(new Set(["本", "末", "未"]));
    expect(m.get("未")).toEqual(new Set(["木", "本", "末"]));
  });

  it("skips comment and blank lines", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "# header\n\n木\t本\n# tail\n");
    const m = loadSimilarKanji(f);
    expect(m.size).toBe(2);
  });

  it("skips lines whose first part is not a kanji", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "abc\tdef\n木\t本\n");
    const m = loadSimilarKanji(f);
    expect(m.has("abc")).toBe(false);
    expect(m.get("木")).toEqual(new Set(["本"]));
  });

  it("accumulates across multiple lines", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "木\t本\n木\t未\n");
    expect(loadSimilarKanji(f).get("木")).toEqual(new Set(["本", "未"]));
  });

  it("returns empty map when file is missing", () => {
    const m = loadSimilarKanji(join(dir, "does-not-exist.tsv"));
    expect(m.size).toBe(0);
  });

  it("deduplicates within a group", () => {
    const f = join(dir, "similar.tsv");
    writeFileSync(f, "木\t本\t木\n");
    expect(loadSimilarKanji(f).get("木")).toEqual(new Set(["本"]));
  });
});
