import { describe, it, expect } from "vitest";
import { buildLookupUrl } from "../../src/lib/audio";

describe("buildLookupUrl", () => {
  const tpl = "http://srv/?term={term}&reading={reading}";

  it("substitutes {term} and {reading}", () => {
    expect(buildLookupUrl("人", "ひと", tpl)).toBe("http://srv/?term=%E4%BA%BA&reading=%E3%81%B2%E3%81%A8");
  });

  it("URL-encodes special chars", () => {
    expect(buildLookupUrl("a b", "c&d", tpl)).toBe("http://srv/?term=a%20b&reading=c%26d");
  });

  it("leaves placeholderless templates alone", () => {
    expect(buildLookupUrl("人", "ひと", "http://srv/static")).toBe("http://srv/static");
  });

  it("substitutes both placeholders independently", () => {
    expect(buildLookupUrl("a", "b", "{term}/{reading}/{term}")).toBe("a/b/{term}");
    // .replace only replaces the first occurrence — documenting actual behavior.
  });
});
