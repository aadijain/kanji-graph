import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedSource } from "./dict/seed.ts";
import { jitendexSource } from "./dict/jitendex.ts";
import { loadFrequencyMap } from "./dict/freq.ts";
import type { DictionarySource, WordEntry } from "./dict/source.ts";
import { KANJI_RE, WORDS_FILE, SIMILAR_KANJI_FILE, GRAPH_OUTPUT, BRIDGE_KANJI_MAX_WORDS } from "./constants.ts";
import { deinflect } from "../src/lib/deinflect.ts";

function chain(...sources: DictionarySource[]): DictionarySource {
  return {
    name: sources.map((s) => s.name).join("→"),
    async prepare() {
      for (const s of sources) await s.prepare?.();
    },
    async lookup(word) {
      for (const s of sources) {
        const r = await s.lookup(word);
        if (r) return r;
      }
      return null;
    },
  };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isKanji = (ch: string) => KANJI_RE.test(ch);
const kanjiOf = (word: string) => [...word].filter(isKanji);

type WordNode = WordEntry & { id: string; kanji: string[]; entries: WordEntry[] };
type EdgeType = "shared-kanji" | "same-reading" | "similar-kanji";
type Edge = { source: string; target: string; type: EdgeType; via: string[] };
type HighFreqConn = {
  type: "shared-kanji" | "similar-kanji";
  kanji: string;
  partnerKanji?: string;
  words: string[];
  perWordCount: number;
};
type Graph = {
  nodes: WordNode[];
  edges: Edge[];
  stats: { words: number; edges: number; kanji: number; hiddenEdges?: Partial<Record<string, number>> };
  highFreqConnections?: HighFreqConn[];
  generatedAt: string;
};

function readWordList(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

async function lookupAll(words: string[], source: DictionarySource): Promise<WordNode[]> {
  await source.prepare?.();
  const nodes: WordNode[] = [];
  const seen = new Set<string>(); // dedupe by resolved dictionary form
  const missing: string[] = [];
  for (const w of words) {
    let entries = await source.lookup(w);
    if (!entries) {
      const candidates = deinflect(w).filter((c) => c !== w);
      for (const c of candidates) {
        entries = await source.lookup(c);
        if (entries) {
          console.log(`[build-graph] deinflected "${w}" → "${entries[0].word}"`);
          break;
        }
      }
    }
    if (!entries) {
      missing.push(w);
      continue;
    }
    const primary = entries[0];
    if (seen.has(primary.word)) {
      console.log(`[build-graph] skipping duplicate "${w}" (resolves to existing "${primary.word}")`);
      continue;
    }
    seen.add(primary.word);
    nodes.push({ ...primary, id: primary.word, kanji: kanjiOf(primary.word), entries });
  }
  if (missing.length) {
    console.warn(`[build-graph] ${missing.length} missing entirely: ${missing.join(", ")}`);
  }
  return nodes;
}

function buildKanjiIndex(nodes: WordNode[]): {
  byKanji: Map<string, string[]>;
  highFreqKanjiSet: Set<string>;
} {
  const byKanji = new Map<string, string[]>();
  for (const node of nodes) {
    for (const k of new Set(node.kanji)) {
      const arr = byKanji.get(k) ?? [];
      arr.push(node.id);
      byKanji.set(k, arr);
    }
  }
  const highFreqKanjiSet = new Set(
    [...byKanji.entries()]
      .filter(([, ids]) => ids.length > BRIDGE_KANJI_MAX_WORDS)
      .map(([k]) => k),
  );
  return { byKanji, highFreqKanjiSet };
}

function buildSharedKanjiEdges(byKanji: Map<string, string[]>): Edge[] {
  const filteredKanji: string[] = [];
  const pairs = new Map<string, { source: string; target: string; via: Set<string> }>();
  for (const [kanji, ids] of byKanji) {
    if (ids.length < 2) continue;
    if (ids.length > BRIDGE_KANJI_MAX_WORDS) {
      filteredKanji.push(`${kanji}(${ids.length})`);
      continue;
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        const key = `${a} ${b}`;
        const existing = pairs.get(key);
        if (existing) existing.via.add(kanji);
        else pairs.set(key, { source: a, target: b, via: new Set([kanji]) });
      }
    }
  }
  if (filteredKanji.length) {
    console.log(`[build-graph] skipped ${filteredKanji.length} high-freq bridge kanji (>${BRIDGE_KANJI_MAX_WORDS} words): ${filteredKanji.join(", ")}`);
  }
  return [...pairs.values()].map((p) => ({
    source: p.source,
    target: p.target,
    type: "shared-kanji" as const,
    via: [...p.via],
  }));
}

function buildSameReadingEdges(nodes: WordNode[]): Edge[] {
  const byReading = new Map<string, string[]>();
  for (const n of nodes) {
    const readings = new Set(n.entries.map((e) => e.reading?.trim()).filter(Boolean) as string[]);
    for (const r of readings) {
      const arr = byReading.get(r) ?? [];
      arr.push(n.id);
      byReading.set(r, arr);
    }
  }
  const edges: Edge[] = [];
  for (const [reading, ids] of byReading) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        edges.push({ source: a, target: b, type: "same-reading", via: [reading] });
      }
    }
  }
  return edges;
}

function loadSimilarKanji(path: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.warn(`[build-graph] no similar-kanji dataset at ${path}; skipping similar-kanji edges`);
    return map;
  }
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/).filter((p) => isKanji(p[0] ?? ""));
    if (parts.length < 2) continue;
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[i] !== parts[j]) {
          add(parts[i], parts[j]);
          add(parts[j], parts[i]);
        }
      }
    }
  }
  return map;
}

// High-freq pairs are skipped entirely; they appear in highFreqConnections instead.
function buildSimilarKanjiEdges(
  nodes: WordNode[],
  similar: Map<string, Set<string>>,
  highFreqKanjiSet: Set<string>,
): Edge[] {
  if (similar.size === 0) return [];
  const byKanji = new Map<string, string[]>();
  for (const n of nodes) {
    for (const k of new Set(n.kanji)) {
      const arr = byKanji.get(k) ?? [];
      arr.push(n.id);
      byKanji.set(k, arr);
    }
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const pairs = new Map<string, { source: string; target: string; via: Set<string> }>();
  for (const [k1, sims] of similar) {
    const owners1 = byKanji.get(k1);
    if (!owners1) continue;
    for (const k2 of sims) {
      if (k1 >= k2) continue; // process each unordered similar-pair once
      if (highFreqKanjiSet.has(k1) || highFreqKanjiSet.has(k2)) continue;
      const owners2 = byKanji.get(k2);
      if (!owners2) continue;
      for (const a of owners1) {
        for (const b of owners2) {
          if (a === b) continue;
          // If either word already contains both kanji of the similar pair,
          // the visual similarity is internal to that word, not a reason to link.
          const aNode = nodeById.get(a)!;
          const bNode = nodeById.get(b)!;
          const aHasBoth = aNode.kanji.includes(k1) && aNode.kanji.includes(k2);
          const bHasBoth = bNode.kanji.includes(k1) && bNode.kanji.includes(k2);
          if (aHasBoth || bHasBoth) continue;
          const [s, t] = [a, b].sort();
          const key = `${s} ${t}`;
          const existing = pairs.get(key);
          if (existing) {
            existing.via.add(k1);
            existing.via.add(k2);
          } else {
            pairs.set(key, { source: s, target: t, via: new Set([k1, k2]) });
          }
        }
      }
    }
  }

  return [...pairs.values()].map((p) => ({
    source: p.source,
    target: p.target,
    type: "similar-kanji" as const,
    via: [...p.via],
  }));
}

// Builds HighFreqConn entries for both shared-kanji and similar-kanji types.
// For shared-kanji: one entry per high-freq kanji (kanji = display kanji).
// For similar-kanji: two entries per pair (one for each side), so each word
// can look up its entry and find its dim-kanji (its own side) and display
// kanji (partnerKanji, the other side).
//
// sharedPairSet: the set of word-pair keys (sorted "a b") that already have a
// visible shared-kanji edge. Used to avoid double-counting pairs that share
// both a regular kanji and a high-freq kanji.
function buildHighFreqConnections(
  byKanji: Map<string, string[]>,
  highFreqKanjiSet: Set<string>,
  similar: Map<string, Set<string>>,
  nodes: WordNode[],
  sharedPairSet: Set<string>,
): { connections: HighFreqConn[]; hiddenShared: number; hiddenSimilar: number } {
  const connections: HighFreqConn[] = [];
  let hiddenShared = 0;
  let hiddenSimilar = 0;

  for (const [k, ids] of byKanji) {
    if (!highFreqKanjiSet.has(k) || ids.length < 2) continue;
    // Only count pairs that don't already have a visible shared-kanji edge.
    let newPairs = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        if (!sharedPairSet.has(`${a} ${b}`)) newPairs++;
      }
    }
    if (!newPairs) continue;
    hiddenShared += newPairs;
    connections.push({ type: "shared-kanji", kanji: k, words: ids, perWordCount: ids.length - 1 });
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const [k1, sims] of similar) {
    for (const k2 of sims) {
      if (k1 >= k2) continue;
      if (!highFreqKanjiSet.has(k1) && !highFreqKanjiSet.has(k2)) continue;
      const owners1 = byKanji.get(k1);
      const owners2 = byKanji.get(k2);
      if (!owners1 || !owners2) continue;
      // Exclude words that contain both k1 and k2 (internal similarity).
      const valid1 = owners1.filter((id) => {
        const n = nodeById.get(id)!;
        return !(n.kanji.includes(k1) && n.kanji.includes(k2));
      });
      const valid2 = owners2.filter((id) => {
        const n = nodeById.get(id)!;
        return !(n.kanji.includes(k1) && n.kanji.includes(k2));
      });
      if (!valid1.length || !valid2.length) continue;
      connections.push({ type: "similar-kanji", kanji: k1, partnerKanji: k2, words: valid1, perWordCount: valid2.length });
      connections.push({ type: "similar-kanji", kanji: k2, partnerKanji: k1, words: valid2, perWordCount: valid1.length });
      hiddenSimilar += valid1.length * valid2.length;
    }
  }

  return { connections, hiddenShared, hiddenSimilar };
}

async function main() {
  const wordsPath = resolve(ROOT, WORDS_FILE);
  const outPath = resolve(ROOT, GRAPH_OUTPUT);

  const words = readWordList(wordsPath);
  console.log(`[build-graph] ${words.length} words from ${wordsPath}`);

  const source = chain(jitendexSource, seedSource);
  const nodes = await lookupAll(words, source);

  const freqMap = await loadFrequencyMap();
  if (freqMap.size > 0) {
    let overlaid = 0;
    for (const node of nodes) {
      const f = freqMap.get(node.word);
      if (f != null) { node.frequency = f; overlaid++; }
    }
    console.log(`[build-graph] frequency overlaid for ${overlaid}/${nodes.length} nodes`);
  }

  const { byKanji, highFreqKanjiSet } = buildKanjiIndex(nodes);
  const similar = loadSimilarKanji(resolve(ROOT, SIMILAR_KANJI_FILE));
  const sharedEdges = buildSharedKanjiEdges(byKanji);
  const sharedPairSet = new Set(sharedEdges.map((e) => `${e.source} ${e.target}`));
  const edges: Edge[] = [
    ...sharedEdges,
    ...buildSameReadingEdges(nodes),
    ...buildSimilarKanjiEdges(nodes, similar, highFreqKanjiSet),
  ];

  const { connections: highFreqConnections, hiddenShared, hiddenSimilar } =
    buildHighFreqConnections(byKanji, highFreqKanjiSet, similar, nodes, sharedPairSet);

  const edgeCounts = edges.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `[build-graph] edges by type: ${Object.entries(edgeCounts)
      .map(([t, n]) => `${t}=${n}`)
      .join(", ")}`,
  );
  if (hiddenShared || hiddenSimilar) {
    console.log(`[build-graph] hidden edges (high-freq): shared-kanji=${hiddenShared}, similar-kanji=${hiddenSimilar}`);
  }

  const allKanji = new Set<string>();
  for (const n of nodes) for (const k of n.kanji) allKanji.add(k);

  const hiddenEdges: Partial<Record<string, number>> = {};
  if (hiddenShared) hiddenEdges["shared-kanji"] = hiddenShared;
  if (hiddenSimilar) hiddenEdges["similar-kanji"] = hiddenSimilar;

  const graph: Graph = {
    nodes,
    edges,
    stats: {
      words: nodes.length,
      edges: edges.length + hiddenShared + hiddenSimilar,
      kanji: allKanji.size,
      ...(Object.keys(hiddenEdges).length ? { hiddenEdges } : {}),
    },
    ...(highFreqConnections.length ? { highFreqConnections } : {}),
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(graph, null, 2));
  console.log(
    `[build-graph] wrote ${outPath} — ${graph.stats.words} words, ${graph.stats.edges} edges, ${graph.stats.kanji} unique kanji`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
