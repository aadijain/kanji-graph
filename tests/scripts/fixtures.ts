// Shared fixtures for build-graph tests.

import type { WordEntry } from "../../scripts/dict/source";

type WordNode = WordEntry & { id: string; kanji: string[]; entries: WordEntry[] };

const KANJI_RE = /[一-鿿]/;
const kanjiOf = (w: string) => [...w].filter((ch) => KANJI_RE.test(ch));

export function makeNode(
  word: string,
  reading: string,
  opts: Partial<Pick<WordEntry, "glosses" | "jlpt" | "frequency">> & { entries?: WordEntry[] } = {},
): WordNode {
  const primary: WordEntry = {
    word,
    reading,
    glosses: opts.glosses ?? [`${word}-gloss`],
    ...(opts.jlpt != null ? { jlpt: opts.jlpt } : {}),
    ...(opts.frequency != null ? { frequency: opts.frequency } : {}),
  };
  return {
    ...primary,
    id: word,
    kanji: kanjiOf(word),
    entries: opts.entries ?? [primary],
  };
}

export const sortedPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export function edgeKey(e: { source: string; target: string }): string {
  return `${e.source}__${e.target}`;
}
