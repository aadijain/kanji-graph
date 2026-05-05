import { useEffect, useMemo, useState } from "react";
import { toRomaji } from "wanakana";
import { useStore } from "../store";
import type { WordNode } from "../types";

const MAX_RESULTS = 8;

// Pre-normalize a node's reading to romaji for romaji query matching.
const readingRomaji = (node: WordNode) => toRomaji(node.reading).toLowerCase();

function matchesQuery(node: WordNode, q: string, qRomaji: string): boolean {
  return (
    node.word.includes(q) ||
    node.reading.includes(q) ||
    readingRomaji(node).includes(qRomaji)
  );
}

// Lower score = ranked higher.
// Prefer starts-with over contains; romaji hits rank below direct hits.
function resultScore(node: WordNode, q: string, qRomaji: string): number {
  if (node.word.startsWith(q) || node.reading.startsWith(q)) return 0;
  if (node.word.includes(q) || node.reading.includes(q)) return 1;
  if (readingRomaji(node).startsWith(qRomaji)) return 2;
  return 3;
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

  const results = useMemo(() => {
    if (!graph || !query) return [];
    const qRomaji = query.toLowerCase();
    return graph.nodes
      .filter((n) => matchesQuery(n, query, qRomaji))
      .sort((a, b) => resultScore(a, query, qRomaji) - resultScore(b, query, qRomaji))
      .slice(0, MAX_RESULTS);
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
                  } ${i === results.length - 1 ? "rounded-b-xl" : ""}`}
                >
                  <span className="jp text-base font-medium text-ink-100">{node.word}</span>
                  <span className="jp text-xs text-ink-500">{node.reading}</span>
                  {node.glosses[0] && (
                    <span className="truncate text-xs text-ink-600">{node.glosses[0]}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
