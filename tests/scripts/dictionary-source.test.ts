import { describe, it, expect, vi } from "vitest";
import { chain, lookupAll } from "../../scripts/build-graph";
import type { DictionarySource, WordEntry } from "../../scripts/dict/source";

function source(name: string, entries: Record<string, WordEntry[]>): DictionarySource & { prepare: () => Promise<void> } {
  return {
    name,
    prepare: vi.fn(async () => {}),
    lookup: vi.fn(async (w: string) => entries[w] ?? null),
  };
}

describe("chain", () => {
  it("returns the first hit and stops querying further sources", async () => {
    const a = source("a", { 人: [{ word: "人", reading: "ひと", glosses: ["a"] }] });
    const b = source("b", { 人: [{ word: "人", reading: "じん", glosses: ["b"] }] });
    const c = chain(a, b);
    const got = await c.lookup("人");
    expect(got?.[0].reading).toBe("ひと");
    expect(b.lookup).not.toHaveBeenCalled();
  });

  it("falls through to the next source when earlier sources return null", async () => {
    const a = source("a", {});
    const b = source("b", { 人: [{ word: "人", reading: "じん", glosses: ["b"] }] });
    const c = chain(a, b);
    expect((await c.lookup("人"))?.[0].reading).toBe("じん");
    expect(a.lookup).toHaveBeenCalled();
    expect(b.lookup).toHaveBeenCalled();
  });

  it("returns null when no source has a hit", async () => {
    const a = source("a", {});
    const b = source("b", {});
    expect(await chain(a, b).lookup("人")).toBeNull();
  });

  it("calls prepare() on every source", async () => {
    const a = source("a", {});
    const b = source("b", {});
    const c = chain(a, b);
    await c.prepare?.();
    expect(a.prepare).toHaveBeenCalledOnce();
    expect(b.prepare).toHaveBeenCalledOnce();
  });

  it("concatenates source names with arrows", () => {
    expect(chain(source("a", {}), source("b", {}), source("c", {})).name).toBe("a→b→c");
  });
});

describe("lookupAll", () => {
  it("returns one node per word with primary entry promoted", async () => {
    const src = source("s", {
      人: [{ word: "人", reading: "ひと", glosses: ["person"] }],
      食: [{ word: "食", reading: "しょく", glosses: ["meal"] }],
    });
    const nodes = await lookupAll(["人", "食"], src);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe("人");
    expect(nodes[0].kanji).toEqual(["人"]);
    expect(nodes[1].reading).toBe("しょく");
  });

  it("falls back to deinflected candidates when direct lookup fails", async () => {
    const src = source("s", {
      食べる: [{ word: "食べる", reading: "たべる", glosses: ["eat"] }],
    });
    const nodes = await lookupAll(["食べた"], src);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("食べる");
  });

  it("dedupes inflected forms that resolve to the same dictionary form", async () => {
    const src = source("s", {
      食べる: [{ word: "食べる", reading: "たべる", glosses: ["eat"] }],
    });
    const nodes = await lookupAll(["食べた", "食べて", "食べる"], src);
    expect(nodes).toHaveLength(1);
  });

  it("skips words that cannot be resolved at all", async () => {
    const src = source("s", { 人: [{ word: "人", reading: "ひと", glosses: ["person"] }] });
    const nodes = await lookupAll(["人", "存在しない"], src);
    expect(nodes.map((n) => n.id)).toEqual(["人"]);
  });

  it("preserves all entries from the primary lookup, not just the first", async () => {
    const src = source("s", {
      人: [
        { word: "人", reading: "ひと", glosses: ["primary"] },
        { word: "人", reading: "じん", glosses: ["secondary"] },
      ],
    });
    const [n] = await lookupAll(["人"], src);
    expect(n.entries).toHaveLength(2);
    expect(n.entries[1].reading).toBe("じん");
  });
});
