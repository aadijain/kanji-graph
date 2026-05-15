import { describe, it, expect } from "vitest";
import { cleanText, jlptFromTags } from "../../scripts/dict/jitendex";

describe("cleanText", () => {
  it("strips zero-width space", () => {
    expect(cleanText("hi​there")).toBe("hithere");
  });

  it("collapses whitespace", () => {
    expect(cleanText("a   b\t\nc")).toBe("a b c");
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanText("  hi  ")).toBe("hi");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(cleanText("   ")).toBe("");
  });
});

describe("jlptFromTags", () => {
  it("parses 'jlptN5'", () => {
    expect(jlptFromTags("jlptN5")).toBe(5);
  });

  it("parses 'jlpt-n3'", () => {
    expect(jlptFromTags("jlpt-n3")).toBe(3);
  });

  it("parses 'jlpt5'", () => {
    expect(jlptFromTags("jlpt5")).toBe(5);
  });

  it("is case-insensitive", () => {
    expect(jlptFromTags("JLPT-N1")).toBe(1);
  });

  it("returns undefined when no tag is present", () => {
    expect(jlptFromTags("ichi1 news1")).toBeUndefined();
    expect(jlptFromTags("")).toBeUndefined();
  });

  it("works when surrounded by other tags", () => {
    expect(jlptFromTags("ichi1 jlptN2 news1")).toBe(2);
  });

  it("only accepts levels 1-5", () => {
    expect(jlptFromTags("jlptN6")).toBeUndefined();
    expect(jlptFromTags("jlptN0")).toBeUndefined();
  });
});
