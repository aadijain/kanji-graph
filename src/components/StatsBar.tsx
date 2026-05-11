import { useMemo, useState } from "react";
import { useStore } from "../store";
import type { Edge, EdgeType, HighFreqConnection } from "../types";
import { EDGE_TYPE_META } from "../lib/constants";
import { endpointId } from "../types";

const EDGE_TYPES = Object.keys(EDGE_TYPE_META) as EdgeType[];

export default function StatsBar() {
  const graph = useStore((s) => s.graph);
  const focused = useStore((s) => s.focused);
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const [expanded, setExpanded] = useState(false);

  const globalByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of (graph?.edges ?? []) as Edge[]) counts[e.type] = (counts[e.type] ?? 0) + 1;
    return counts;
  }, [graph]);

  const focusedByType = useMemo(() => {
    if (!focused || !graph) return null;
    const counts: Record<string, number> = {};
    const regularNeighbors = new Set<string>();
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s === focused.id) { counts[e.type] = (counts[e.type] ?? 0) + 1; regularNeighbors.add(t); }
      else if (t === focused.id) { counts[e.type] = (counts[e.type] ?? 0) + 1; regularNeighbors.add(s); }
    }
    for (const c of (graph.highFreqConnections ?? []) as HighFreqConnection[]) {
      if (!c.words.includes(focused.id)) continue;
      // shared-kanji: exact count using words list minus already-visible neighbors
      // similar-kanji: perWordCount is exact (entire pair was suppressed, no regular edges exist)
      const hidden = c.type === "shared-kanji"
        ? c.words.filter((id) => id !== focused.id && !regularNeighbors.has(id)).length
        : c.perWordCount;
      counts[c.type] = (counts[c.type] ?? 0) + hidden;
    }
    return counts;
  }, [focused, graph]);

  if (!graph) return null;

  if (focusedByType) {
    const total = EDGE_TYPES.reduce((sum, t) => sum + (focusedByType[t] ?? 0), 0);
    return (
      <div className="flex gap-5 rounded-lg bg-ink-900 px-3 py-1.5 text-2xs uppercase tracking-wide text-ink-300">
        <span className="pointer-events-none">
          <span className="text-accent-paper">{total}</span> connections
        </span>
        <span className="pointer-events-none flex gap-2">
          {EDGE_TYPES.filter((t) => (focusedByType[t] ?? 0) > 0).map((t, i) => (
            <span key={t}>
              {i > 0 && <span className="text-ink-600"> · </span>}
              <span style={{ color: edgeColors[t] }}>{focusedByType[t]}</span>
              {" "}{EDGE_TYPE_META[t].label}
            </span>
          ))}
        </span>
      </div>
    );
  }

  const { words, edges, kanji } = graph.stats;
  return (
    <div className="flex gap-5 rounded-lg bg-ink-900 px-3 py-1.5 text-2xs uppercase tracking-wide text-ink-300">
      <span className="pointer-events-none">
        <span className="text-accent-paper">{words}</span> words
      </span>
      <span className="pointer-events-none">
        <span className="text-accent-paper">{kanji}</span> kanji
      </span>
      <span
        className="cursor-default"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {expanded ? (
          <>
            {EDGE_TYPES.map((t, i) => (
              <span key={t}>
                {i > 0 && <span className="text-ink-600"> · </span>}
                <span style={{ color: edgeColors[t] }}>
                  {(globalByType[t] ?? 0) + (graph.stats.hiddenEdges?.[t] ?? 0)}
                </span>
                {" "}{EDGE_TYPE_META[t].label}
              </span>
            ))}
          </>
        ) : (
          <>
            <span className="text-accent-paper">{edges}</span> connections
          </>
        )}
      </span>
    </div>
  );
}
