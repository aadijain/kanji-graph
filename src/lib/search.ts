import { toRomaji } from "wanakana";
import type { WordNode } from "../types";
import { getNodeEntries } from "./utils";

// Reading that matched the query: the secondary-entry reading if that's what hit.
export function matchedReading(node: WordNode, q: string, qRomaji: string): string {
  if (node.reading.includes(q) || toRomaji(node.reading).toLowerCase().includes(qRomaji)) return node.reading;
  const match = node.entries?.find(
    (e) => e.reading.includes(q) || toRomaji(e.reading).toLowerCase().includes(qRomaji)
  );
  return match?.reading ?? node.reading;
}

function allReadings(node: WordNode): string[] {
  return [...new Set(getNodeEntries(node).map((e) => e.reading).filter(Boolean))];
}

export function matchesQuery(node: WordNode, q: string, qRomaji: string, qForms: string[]): boolean {
  const readings = allReadings(node);
  return (
    node.word.includes(q) ||
    readings.some((r) => r.includes(q)) ||
    readings.some((r) => toRomaji(r).toLowerCase().includes(qRomaji)) ||
    qForms.some((c) => node.word === c)
  );
}

// Lower score = ranked higher. Tiers: exact kana > kana starts-with > kana contains >
// exact romaji > romaji starts-with > romaji contains > deinflected.
// Romaji exact is split from starts-with so "jin" (=じん) outranks "jin" as prefix of じんせい.
export function resultScore(node: WordNode, q: string, qRomaji: string, qForms: string[]): number {
  const readings = allReadings(node);
  const romajis = readings.map((r) => toRomaji(r).toLowerCase());
  if (node.word === q || readings.some((r) => r === q)) return 0;
  if (node.word.startsWith(q) || readings.some((r) => r.startsWith(q))) return 1;
  if (node.word.includes(q) || readings.some((r) => r.includes(q))) return 2;
  if (romajis.some((r) => r === qRomaji)) return 3;
  if (romajis.some((r) => r.startsWith(qRomaji))) return 4;
  if (romajis.some((r) => r.includes(qRomaji))) return 5;
  if (qForms.some((c) => node.word === c)) return 6;
  return 7;
}

// Index of the highest-score entry whose reading best matches the query.
// Scans in quality order so the best-quality match wins, and within that the
// earliest (highest-score) entry index is returned.
export function matchingEntryIdx(node: WordNode, q: string, qRomaji: string): number {
  const entries = getNodeEntries(node);
  const preds = [
    (r: string) => r === q,
    (r: string) => r.startsWith(q),
    (r: string) => r.includes(q),
    (r: string) => toRomaji(r).toLowerCase() === qRomaji,
    (r: string) => toRomaji(r).toLowerCase().includes(qRomaji),
  ];
  for (const pred of preds) {
    for (let i = 0; i < entries.length; i++) {
      const r = entries[i].reading;
      if (r && pred(r)) return i;
    }
  }
  return 0;
}
