import { useEffect, useMemo, useState } from "react";
import { toRomaji } from "wanakana";
import { useStore } from "../store";
import { deinflect } from "../lib/deinflect";
import type { WordNode } from "../types";
import { SEARCH_MAX_RESULTS } from "../lib/constants";

// Return the reading that matched the query: the secondary entry's reading if that's what matched.
function matchedReading(node: WordNode, q: string, qRomaji: string): string {
  if (node.reading.includes(q) || toRomaji(node.reading).toLowerCase().includes(qRomaji)) return node.reading;
  const match = node.entries?.find(
    (e) => e.reading.includes(q) || toRomaji(e.reading).toLowerCase().includes(qRomaji)
  );
  return match?.reading ?? node.reading;
}

function allReadings(node: WordNode): string[] {
  return [...new Set((node.entries ?? []).map((e) => e.reading).filter(Boolean))];
}

function matchesQuery(node: WordNode, q: string, qRomaji: string, qForms: string[]): boolean {
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
function resultScore(node: WordNode, q: string, qRomaji: string, qForms: string[]): number {
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
// Scans in quality order (exact kana > kana starts-with > kana contains > exact romaji >
// romaji contains) so the best-quality match wins, and within that the earliest
// (highest-score) entry index is returned.
function matchingEntryIdx(node: WordNode, q: string, qRomaji: string): number {
  const entries = node.entries ?? [];
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

export default function SearchOverlay({
  blocked = false,
  open = false,
  onClose,
}: {
  blocked?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const graph = useStore((s) => s.graph);
  const setFocused = useStore((s) => s.setFocused);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const active = open || query.length > 0;

  const q = query.trim();
  const qRomaji = q.toLowerCase();

  const { results, overflow } = useMemo(() => {
    if (!graph || !q) return { results: [], overflow: 0 };
    const qForms = deinflect(q).filter((c) => c !== q);
    const all = graph.nodes
      .filter((n) => matchesQuery(n, q, qRomaji, qForms))
      .sort((a, b) => {
        const scoreDiff = resultScore(a, q, qRomaji, qForms) - resultScore(b, q, qRomaji, qForms);
        if (scoreDiff !== 0) return scoreDiff;
        const entryDiff = matchingEntryIdx(a, q, qRomaji) - matchingEntryIdx(b, q, qRomaji);
        if (entryDiff !== 0) return entryDiff;
        return (a.frequency ?? Infinity) - (b.frequency ?? Infinity);
      });
    return { results: all.slice(0, SEARCH_MAX_RESULTS), overflow: Math.max(0, all.length - SEARCH_MAX_RESULTS) };
  }, [graph, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const commit = (node: WordNode) => {
    setFocused(node);
    setQuery("");
    onClose?.();
  };

  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text) {
        setQuery((q) => q + text);
        e.stopPropagation();
        e.preventDefault();
      }
    };
    document.addEventListener("paste", onPaste, { capture: true });
    return () => document.removeEventListener("paste", onPaste, { capture: true });
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (!active) {
        if (!blocked && e.key.length === 1) {
          setQuery(e.key);
          e.preventDefault();
        }
        return;
      }

      if (e.key === "Escape") {
        setQuery("");
        onClose?.();
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (e.key === "Backspace") {
        setQuery((q) => q.slice(0, -1));
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown") {
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        setSelectedIdx((i) => Math.max(i - 1, 0));
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const node = results[selectedIdx];
        if (node) commit(node);
        e.preventDefault();
        return;
      }
      if (e.key.length === 1) {
        setQuery((q) => q + e.key);
        e.preventDefault();
      }
    };
    // Capture phase so we intercept before App's Esc handler
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [active, results, selectedIdx]);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex justify-center pt-20"
      onClick={() => { setQuery(""); onClose?.(); }}
    >
      <div
        className="pointer-events-auto h-fit w-96 rounded-xl border border-ink-700 bg-ink-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Query display */}
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <span className="text-xs text-ink-500">search</span>
          <span className="flex-1 text-lg text-ink-100">
            {query}
            <span className="ml-px inline-block h-[1em] w-px animate-pulse bg-ink-400 align-text-bottom" />
          </span>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="px-4 py-3 text-xs text-ink-600">no matches</div>
        ) : (
          <ul>
            {results.map((node, i) => (
              <li key={node.id}>
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={() => commit(node)}
                  className={`flex w-full items-baseline gap-3 px-4 py-2 text-left transition-colors ${
                    i === selectedIdx
                      ? "bg-ink-800 text-ink-100"
                      : "text-ink-400 hover:bg-ink-900"
                  } ${i === results.length - 1 && !overflow ? "rounded-b-xl" : ""}`}
                >
                  <span className="jp text-base font-medium text-ink-100">{node.word}</span>
                  <span className="jp text-xs text-ink-500">{matchedReading(node, q, qRomaji)}</span>
                  {node.glosses[0] && (
                    <span className="truncate text-xs text-ink-600">{node.glosses[0]}</span>
                  )}
                </button>
              </li>
            ))}
            {overflow > 0 && (
              <li className="rounded-b-xl px-4 py-2 text-xs text-ink-600">+{overflow} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
